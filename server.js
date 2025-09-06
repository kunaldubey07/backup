'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectGateway, disconnectGateway } = require('./utils/gateway');
const { startListener, addSseClient } = require('./utils/live');

const PORT = process.env.PORT || 3000;
const CHANNEL = process.env.CHANNEL || 'tracechannel';  // Must be lowercase and hyphenated
const CC_NAME = process.env.CC_NAME || 'tracecc';

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static('public'));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Role-based authorization middleware
function authorize(roles = []) {
  return (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ','');
    const session = token && sessions.get(token);
    if (!session) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    if (roles.length && !roles.includes(session.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    req.user = session;
    next();
  };
}

async function useContract(callback) {
  const { gateway, contract } = await connectGateway({ channelName: CHANNEL, chaincodeName: CC_NAME });
  try {
    return await callback(contract);
  } finally {
    await disconnectGateway(gateway);
  }
}

const sessions = new Map();

// Simple test endpoint to verify connectivity
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Server is running!', 
    timestamp: new Date().toISOString(),
    status: 'connected'
  });
});

// User registration endpoint (matches your PowerShell command)
app.post('/api/users', async (req, res) => {
  try {
    const { userId, name, role, organization, email, phone } = req.body;
    
    if (!name || !role || !organization) {
      return res.status(400).json({ error: 'Name, role, and organization are required' });
    }

    const userData = {
      userId: userId || `USER-${Date.now()}`,
      name,
      role,
      organization,
      contact: { 
        email: email || '', 
        phone: phone || '' 
      },
      status: 'active',
      registeredAt: new Date().toISOString(),
      registeredBy: 'system'
    };
    
    const result = await useContract(c => c.submitTransaction('registerUser', JSON.stringify(userData)));
    const parsedResult = JSON.parse(result.toString() || '{}');
    
    res.json({
      ...parsedResult,
      message: 'User created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('User creation error:', e);
    res.status(400).json({ error: e.message });
  }
});

// Authentication endpoints
app.post('/auth/login', async (req, res) => {
  const { role, name } = req.body || {};
  if (!role || !['admin','farmer','lab','customer'].includes(role)) {
    return res.status(400).json({ error: 'invalid role' });
  }
  
  try {
    // Verify user against blockchain registry
    const userResult = await useContract(c => c.evaluateTransaction('queryUser', name));
    const user = JSON.parse(userResult.toString() || '{}');
    
    if (!user.userId || user.status !== 'active') {
      return res.status(401).json({ error: 'User not found or inactive' });
    }
    
    if (user.role !== role) {
      return res.status(403).json({ error: 'Invalid role for user' });
    }

    // Create session
    const token = Math.random().toString(36).slice(2);
    const session = {
      token,
      role: user.role,
      name: user.name,
      organization: user.organization,
      ts: Date.now()
    };
    
    sessions.set(token, session);
    res.json(session);
  } catch (e) {
    console.error('Login failed:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/auth/me', (req, res) => {
  const token = req.headers['authorization']?.replace('Bearer ','');
  const s = token && sessions.get(token);
  if (!s) return res.status(401).json({ error: 'unauthorized' });
  res.json(s);
});

// Collection Events
app.post('/collection-event', authorize(['admin', 'farmer']), async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const result = await useContract(c => c.submitTransaction('createCollectionEvent', payload));
    const parsedResult = JSON.parse(result.toString() || '{}');

    // Get transaction details from the gateway
    const { gateway } = await connectGateway({ channelName: CHANNEL, chaincodeName: CC_NAME });
    const network = await gateway.getNetwork(CHANNEL);
    const channel = network.getChannel();
    const lastCommittedBlock = await channel.queryInfo();

    res.json({
      ...parsedResult,
      txId: result.getTransactionId ? result.getTransactionId() : 'confirmed',
      blockNumber: lastCommittedBlock.height.low,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    });
  } catch (e) {
    console.error('Collection event error:', e);
    res.status(400).json({ error: e.message });
  }
});

app.get('/collection-events', authorize(['admin', 'farmer', 'lab']), async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryAllCollectionEvents'));
    let data = JSON.parse(result?.toString() || '[]');
    if (Array.isArray(data)) {
      // Filter based on role
      if (req.user.role === 'farmer') {
        data = data.filter(event => event.collectorId === req.user.name);
      } else if (req.user.role === 'lab') {
        // Labs can only see events that are ready for testing
        data = data.filter(event => !event.qualityTestId);
      }
      res.json(data);
    } else {
      res.json([]);
    }
  } catch (e) {
    console.error('Failed to fetch collection events:', e);
    res.json([]); 
  }
});

app.get('/collection-events/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryCollectionEvent', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.put('/collection-events/:id', authorize(['admin', 'farmer']), async (req, res) => {
  try {
    const event = { ...req.body, eventId: req.params.id };
    const result = await useContract(c => c.submitTransaction('updateCollectionEvent', JSON.stringify(event)));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/collection-events/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.submitTransaction('deleteCollectionEvent', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Quality Tests
app.post('/quality-test', authorize(['admin', 'lab']), async (req, res) => {
  try {
    // Enhance test data with lab info and standards
    const testData = {
      ...req.body,
      labId: req.user.name,
      testerId: req.user.name,
      standardsVersion: 'AYUSH-2025',
      testingProtocol: 'ISO-9001',
      testTimestamp: new Date().toISOString(),
      labCertification: 'NABL-CERTIFIED',
      equipmentId: req.body.equipmentId || 'STD-LAB-001'
    };

    // Validate minimum required parameters
    const requiredParams = ['moisture', 'purity', 'foreignMatter'];
    const parameters = JSON.parse(testData.parameters || '{}');
    const missingParams = requiredParams.filter(p => !parameters[p]);
    
    if (missingParams.length > 0) {
      return res.status(400).json({ 
        error: `Missing required test parameters: ${missingParams.join(', ')}`,
        requiredParams
      });
    }

    const payload = JSON.stringify(testData);
    const result = await useContract(c => c.submitTransaction('createQualityTest', payload));
    
    // Update collection event with test reference
    const testResult = JSON.parse(result.toString() || '{}');
    if (testResult.eventId) {
      await useContract(c => c.submitTransaction('updateCollectionEvent', JSON.stringify({
        eventId: testResult.eventId,
        qualityTestId: testResult.testId,
        testStatus: testResult.result
      })));
    }

    res.json(testResult);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/quality-tests', async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryAllQualityTests'));
    const data = JSON.parse(result?.toString() || '[]');
    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to fetch quality tests:', e);
    res.json([]);
  }
});

app.get('/quality-tests/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryQualityTest', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.put('/quality-tests/:id', authorize(['admin', 'lab']), async (req, res) => {
  try {
    const test = { ...req.body, testId: req.params.id };
    const result = await useContract(c => c.submitTransaction('updateQualityTest', JSON.stringify(test)));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/quality-tests/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.submitTransaction('deleteQualityTest', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Processing Steps
app.post('/processing-step', authorize(['admin']), async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const result = await useContract(c => c.submitTransaction('createProcessingStep', payload));
    res.json(JSON.parse(result.toString() || '{}'));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/processing-steps', async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryAllProcessingSteps'));
    const data = JSON.parse(result?.toString() || '[]');
    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to fetch processing steps:', e);
    res.json([]);
  }
});

app.get('/processing-steps/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryProcessingStep', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.put('/processing-steps/:id', authorize(['admin']), async (req, res) => {
  try {
    const step = { ...req.body, stepId: req.params.id };
    const result = await useContract(c => c.submitTransaction('updateProcessingStep', JSON.stringify(step)));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/processing-steps/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.submitTransaction('deleteProcessingStep', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Batch Operations
app.post('/batch', async (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const result = await useContract(c => c.submitTransaction('createBatch', payload));
    const parsedResult = JSON.parse(result.toString() || '{}');

    const { gateway } = await connectGateway({ channelName: CHANNEL, chaincodeName: CC_NAME });
    const network = await gateway.getNetwork(CHANNEL);
    const channel = network.getChannel();
    const lastCommittedBlock = await channel.queryInfo();

    res.json({
      ...parsedResult,
      txId: result.getTransactionId ? result.getTransactionId() : 'confirmed',
      blockNumber: lastCommittedBlock.height.low,
      timestamp: new Date().toISOString(),
      status: 'confirmed'
    });
  } catch (e) {
    console.error('Batch creation error:', e);
    res.status(400).json({ error: e.message });
  }
});

app.get('/batch/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const result = await useContract(c => c.evaluateTransaction('getProvenance', id));
    res.json(JSON.parse(result.toString() || '{}'));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.put('/batch/:id', async (req, res) => {
  try {
    const batch = { ...req.body, batchId: req.params.id };
    const result = await useContract(c => c.submitTransaction('updateBatch', JSON.stringify(batch)));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/batch/:id', async (req, res) => {
  try {
    const result = await useContract(c => c.submitTransaction('deleteBatch', req.params.id));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// User Management (Admin only)
app.post('/users', authorize(['admin']), async (req, res) => {
  const { name, role, organization, licenseNumber, contact } = req.body || {};
  try {
    const userData = {
      userId: `USER-${Date.now()}`,
      name,
      role,
      organization,
      licenseNumber,
      contact,
      status: 'active',
      registeredAt: new Date().toISOString(),
      registeredBy: req.user.name
    };
    
    const result = await useContract(c => c.submitTransaction('registerUser', JSON.stringify(userData)));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/users', authorize(['admin']), async (req, res) => {
  try {
    const result = await useContract(c => c.evaluateTransaction('queryAllUsers'));
    const users = JSON.parse(result.toString() || '[]');
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper endpoints
app.get('/collection-events/by-collector/:id', async (req, res) => {
  try {
    const allEventsBuffer = await useContract(c => c.evaluateTransaction('queryAllCollectionEvents'));
    const allEvents = JSON.parse(allEventsBuffer.toString() || '[]');
    const events = allEvents.filter(e => e.collectorId === req.params.id);
    res.json(events);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/quality-tests/by-event/:id', async (req, res) => {
  try {
    const allTestsBuffer = await useContract(c => c.evaluateTransaction('queryAllQualityTests'));
    const allTests = JSON.parse(allTestsBuffer.toString() || '[]');
    const tests = allTests.filter(t => t.eventId === req.params.id);
    res.json(tests);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/processing-steps/by-batch/:id', async (req, res) => {
  try {
    const allStepsBuffer = await useContract(c => c.evaluateTransaction('queryAllProcessingSteps'));
    const allSteps = JSON.parse(allStepsBuffer.toString() || '[]');
    const steps = allSteps.filter(s => s.batchId === req.params.id);
    res.json(steps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Health and stats
app.get('/health', async (req, res) => {
  try {
    await useContract(c => c.evaluateTransaction('queryAllBatches'));
    res.json({ status: 'ok', channel: CHANNEL, chaincode: CC_NAME });
  } catch (e) {
    res.status(500).json({ status: 'error', error: e.message });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const [events, tests, steps, batches] = await Promise.all([
      useContract(c => c.evaluateTransaction('queryAllCollectionEvents')),
      useContract(c => c.evaluateTransaction('queryAllQualityTests')),
      useContract(c => c.evaluateTransaction('queryAllProcessingSteps')),
      useContract(c => c.evaluateTransaction('queryAllBatches'))
    ]);
    res.json({
      counts: {
        collectionEvents: JSON.parse(events.toString() || '[]').length,
        qualityTests: JSON.parse(tests.toString() || '[]').length,
        processingSteps: JSON.parse(steps.toString() || '[]').length,
        batches: JSON.parse(batches.toString() || '[]').length
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List all batches
app.get('/batches', async (req, res) => {
  try {
    const batchesBuf = await useContract(c => c.evaluateTransaction('queryAllBatches'));
    const data = JSON.parse(batchesBuf?.toString() || '[]');
    res.json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error('Failed to fetch batches:', e);
    res.json([]);
  }
});

// Reports endpoint
app.get('/reports/summary', async (req, res) => {
  try {
    const batchesBuf = await useContract(c => c.evaluateTransaction('queryAllBatches'));
    const batches = JSON.parse(batchesBuf.toString() || '[]');
    const report = batches.map(b => ({ batchId: b.batchId, events: b.events?.length || 0, tests: b.qualityTests?.length || 0, steps: b.processingSteps?.length || 0, qrCode: b.qrCode }));
    res.json({ generatedAt: new Date().toISOString(), totalBatches: batches.length, batches: report });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Live block events via SSE
app.get('/live/blocks', async (req, res) => {
  try {
    await startListener({ channelName: CHANNEL, chaincodeName: CC_NAME });
    addSseClient(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// QR Code Generation and Tracking
app.post('/qr/generate', authorize(['admin', 'farmer']), async (req, res) => {
  try {
    const { batchId } = req.body;
    if (!batchId) {
      return res.status(400).json({ error: 'Batch ID is required' });
    }

    const trackingId = `TRK-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    
    const batch = {
      batchId,
      trackingId,
      qrGeneratedBy: req.user.name,
      qrGeneratedAt: new Date().toISOString(),
      qrStatus: 'active'
    };

    const result = await useContract(c => c.submitTransaction('updateBatch', JSON.stringify(batch)));
    const updatedBatch = JSON.parse(result.toString());

    res.json({
      trackingId,
      batchId,
      verificationUrl: `${req.protocol}://${req.get('host')}/verify/${trackingId}`,
      generatedBy: req.user.name,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('QR generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/qr/track/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const result = await useContract(c => c.evaluateTransaction('queryBatchByTracking', trackingId));
    res.json(JSON.parse(result.toString()));
  } catch (e) {
    res.status(404).json({ error: 'QR code not found' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

async function startServer() {
  try {
    // Test connection to blockchain network
    const { gateway, contract } = await connectGateway({ 
      channelName: CHANNEL, 
      chaincodeName: CC_NAME 
    });

    console.log('Successfully connected to blockchain network');
    await disconnectGateway(gateway);

    // Start server after successful connection - FIXED: Bind to 0.0.0.0
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`=================================`);
      console.log(`Traceability API Server Started`);
      console.log(`=================================`);
      console.log(`URL: http://0.0.0.0:${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Channel: ${CHANNEL}`);
      console.log(`Chaincode: ${CC_NAME}`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
