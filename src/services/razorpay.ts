import axios from 'axios';
import { getAuthToken } from './api/auth';
import { updateUserBalance } from './firebase/balance';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Function to get the correct API endpoint
const getApiEndpoint = (endpoint: string) => {
  const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`;
  return `${baseUrl}${endpoint}`;
};

// Function to load Razorpay script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if script is already loaded
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

// Function to create Razorpay order and open payment modal
export const initiatePayment = async (
  userId: string,
  amount: number,
  name: string,
  email: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First load the Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      return { success: false, error: 'Failed to load Razorpay script' };
    }

    // Get authentication token
    let token;
    try {
      token = await getAuthToken();
    } catch (error) {
      return { success: false, error: 'Authentication failed. Please log in again.' };
    }

    // Create order on backend
    const orderResponse = await axios.post(
      getApiEndpoint('/payments/create-order'),
      { amount, userId },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const { orderId } = orderResponse.data;
    
    return new Promise((resolve) => {
      try {
        // @ts-ignore - Razorpay is loaded via script
        const options = {
          key: orderResponse.data.key_id, // Get key from backend
          amount: amount * 100, // Amount in paise
          currency: "INR",
          name: "RajTest",
          description: "Add money to your account",
          order_id: orderId,
          handler: async function(response: any) {
            try {
              // Verify payment on backend
              const verifyResponse = await axios.post(
                getApiEndpoint('/payments/verify'),
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  userId,
                  amount
                },
                {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                }
              );

              if (verifyResponse.data.success) {
                resolve({ success: true });
              } else {
                resolve({ success: false, error: 'Payment verification failed' });
              }
            } catch (error: any) {
              resolve({ 
                success: false, 
                error: error.response?.data?.error || 'Payment verification failed' 
              });
            }
          },
          prefill: {
            name: name,
            email: email,
          },
          theme: {
            color: "#3B82F6",
          },
          modal: {
            ondismiss: function() {
              resolve({ success: false, error: 'Payment cancelled' });
            }
          }
        };

        // @ts-ignore - Razorpay is loaded via script
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
      } catch (error) {
        resolve({ success: false, error: 'Failed to initialize payment' });
      }
    });
  } catch (error: any) {
    return { 
      success: false,
      error: error.response?.data?.error || 'Failed to create payment order' 
    };
  }
};

// Add this to the global Window interface
declare global {
  interface Window {
    Razorpay: any;
  }
}

