import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = 'https://xwkwzbjifh.execute-api.us-east-2.amazonaws.com/v1';
const API_KEY = 'ri_9fbcb675c4e1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, data } = body;
    
    console.log('Webhook received:', { action, userId, data });
    
    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters: action, userId' },
        { status: 400 }
      );
    }
    
    // Handle different webhook actions
    switch (action) {
      case 'add_credits':
        return handleAddCredits(userId, data);
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Handle adding credits to a user via webhook
 */
async function handleAddCredits(userId: string, data: any) {
  try {
    if (!data || typeof data.amount !== 'number' || !data.apiKey) {
      return NextResponse.json(
        { error: 'Missing or invalid parameters: amount or apiKey' },
        { status: 400 }
      );
    }
    
    console.log(`Adding ${data.amount} credits to user ${userId}`);
    
    // Update user credits using the direct endpoint
    const updateUrl = `${API_BASE_URL}/users`;
    
    // Calculate new credit amount
    const newCreditAmount = data.currentCredits + data.amount;
    console.log(`Current credits: ${data.currentCredits}, New credits: ${newCreditAmount}`);
    
    // Prepare the request payload
    const updatePayload = {
      status: "active",
      credits: newCreditAmount,
      plan_type: "credit_based"
    };
    
    console.log('Update payload:', updatePayload);
    console.log('Using API key:', data.apiKey);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': data.apiKey
      },
      body: JSON.stringify(updatePayload)
    });
    
    // Get response as text first for better error logging
    const responseText = await updateResponse.text();
    console.log('API response text:', responseText);
    
    if (!updateResponse.ok) {
      console.error('Failed to update user credits:', responseText);
      return NextResponse.json(
        { error: `Failed to update user credits: ${updateResponse.status}` },
        { status: updateResponse.status }
      );
    }
    
    // Parse the response if it's valid JSON
    let updateResult;
    try {
      updateResult = JSON.parse(responseText);
      console.log('User credits updated:', updateResult);
    } catch (e) {
      console.log('Response is not valid JSON, but operation succeeded');
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: `Added ${data.amount} credits to user ${userId}`,
      updatedCredits: newCreditAmount
    });
  } catch (error: any) {
    console.error('Error in handleAddCredits webhook:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}
