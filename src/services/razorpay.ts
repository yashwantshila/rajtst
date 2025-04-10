
import { updateUserBalance } from './firebase/balance';

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
    console.log('Initiating Razorpay payment for user:', userId, 'amount:', amount);
    
    // First load the Razorpay script
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      console.error('Failed to load Razorpay script');
      return { success: false, error: 'Failed to load Razorpay script' };
    }
    
    return new Promise((resolve) => {
      try {
        // Simple serializable payload for user data - prevents DataCloneError
        const userInfo = {
          id: userId,
          displayName: name,
          email: email
        };
        
        // @ts-ignore - Razorpay is loaded via script
        const options = {
          key: "rzp_live_euXqao5sCXaBbs", // Razorpay Key ID
          amount: amount * 100, // Amount in paise (100 paise = 1 INR)
          currency: "INR",
          name: "RajTest",
          description: "Add money to your RajTest account",
          // Removed order_id as we're not creating an order from backend
          handler: function(response: any) {
            console.log('Payment successful, response:', JSON.stringify(response));
            // Use a serializable copy of the response
            const paymentData = JSON.parse(JSON.stringify(response));
            
            // Update balance in a separate function call
            updateUserBalance(userId, amount)
              .then((newBalance) => {
                console.log('Balance updated successfully:', newBalance);
                resolve({ success: true });
              })
              .catch((error) => {
                console.error('Error updating balance:', error);
                resolve({ success: false, error: 'Payment succeeded but failed to update balance' });
              });
          },
          prefill: {
            name: name,
            email: email,
          },
          theme: {
            color: "#3B82F6", // Primary color
          },
          modal: {
            ondismiss: function() {
              console.log('Payment modal dismissed');
              resolve({ success: false, error: 'Payment cancelled' });
            }
          },
          notes: {
            // You can add custom notes here
            userId: userId
          }
        };

        console.log('Creating Razorpay instance with options:', 
          JSON.stringify({
            ...options,
            key: "***" // Mask the key in logs
          })
        );
        
        // @ts-ignore - Razorpay is loaded via script
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
      } catch (error) {
        console.error('Error creating Razorpay instance:', error);
        resolve({ success: false, error: 'Failed to initialize payment' });
      }
    });
  } catch (error) {
    console.error('Razorpay payment error:', error);
    return { success: false, error: 'Payment failed' };
  }
};

// Add this to the global Window interface
declare global {
  interface Window {
    Razorpay: any;
  }
}
