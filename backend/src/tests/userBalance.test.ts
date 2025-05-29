import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';
import { Suite, Context } from 'mocha';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
let authToken: string | null = null;
let testUserId: string | null = null;

// These tests should be run on a test environment with sample data
describe('User Balance API', function(this: Suite) {
  this.timeout(10000); // 10 second timeout
  
  before(async () => {
    // Setup: Get authentication token for testing
    // This depends on your auth implementation
    // For example:
    /*
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'testuser',
      password: 'testpassword'
    });
    authToken = loginResponse.data.token;
    testUserId = loginResponse.data.userId;
    */
    
    // Replace this with actual implementation
    console.log('Set up your test authentication here');
  });
  
  it('should get user balance', async function(this: Context) {
    if (!authToken || !testUserId) {
      this.skip();
      return;
    }
    
    const response = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('balance');
    expect(typeof response.data.balance).to.equal('number');
  });
  
  it('should update user balance', async function(this: Context) {
    if (!authToken || !testUserId) {
      this.skip();
      return;
    }
    
    const balanceResponse = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    const currentBalance = balanceResponse.data.balance;
    const updateAmount = 100;
    
    const updateResponse = await axios.post(
      `${API_URL}/user/balance/update`,
      {
        userId: testUserId,
        amount: updateAmount,
        type: 'credit'
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.data).to.have.property('success', true);
    expect(updateResponse.data).to.have.property('newBalance');
    
    const verifyResponse = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    expect(verifyResponse.data.balance).to.equal(currentBalance + updateAmount);
  });
}); 