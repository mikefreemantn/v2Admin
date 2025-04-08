import { Amplify } from 'aws-amplify';

// Ensure environment variables are prefixed with NEXT_PUBLIC_ to be available client-side
const amplifyConfig = {
    Auth: {
        Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'us-east-1_p00xl8d3D',
            userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_APP_CLIENT_ID || '6vlgfmeq0mprrj98tifmqm8l6v',
            // region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1' // Optional: Specify region explicitly if needed
        }
    }
    // Add other Amplify category configurations here if needed (e.g., API)
};

let configured = false;

export function configureAmplifyClient() {
    if (!configured) {
        try {
            Amplify.configure(amplifyConfig, { ssr: true }); // ssr: true is important for Next.js
            configured = true;
            console.log("Amplify configured successfully");
        } catch (error) {
            console.error("Error configuring Amplify:", error);
        }
    } else {
        console.log("Amplify already configured");
    }
}
