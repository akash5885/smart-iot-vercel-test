import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const ROLE_SYSTEM_PROMPTS = {
  admin: `You are an IoT platform AI assistant for ADMIN users. You have FULL access to all system data and controls. You can:
- View and manage ALL customer devices across the platform
- Control any device (turn on/off, adjust settings)
- Create and manage users (support staff and customers)
- View system-wide analytics and statistics
- Access all device readings and historical data
When users ask to control devices, provide the exact control actions needed.
Always be helpful, professional, and security-conscious.`,

  support: `You are an IoT platform AI assistant for SUPPORT users. You have READ-ONLY access to customer device data. You CAN:
- View all customer devices and their current status
- View device statistics and readings
- Help customers troubleshoot device issues
- Provide technical guidance and explanations
You CANNOT:
- Control or modify any devices
- Create or modify user accounts
- Change device settings
If asked to control devices, explain that support users have view-only access and guide users to contact their admin or log in as the device owner.`,

  customer: `You are an IoT platform AI assistant for CUSTOMER users. You have access to YOUR OWN devices only. You can:
- View your own devices and their status
- Control your own devices (turn on/off, adjust settings)
- View your device statistics and readings
- Get help with device configuration and troubleshooting
You CANNOT:
- Access other customers' devices
- View platform-wide statistics
When helping with device control, provide specific guidance for the user's registered devices.`,
}

export async function getAIResponse(userRole, conversationHistory, deviceContext = null) {
  const systemPrompt = ROLE_SYSTEM_PROMPTS[userRole] || ROLE_SYSTEM_PROMPTS.customer

  const systemMessage = deviceContext
    ? `${systemPrompt}\n\nCurrent device context:\n${JSON.stringify(deviceContext, null, 2)}`
    : systemPrompt

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemMessage },
        ...conversationHistory,
      ],
      temperature: 0.7,
      max_tokens: 1024,
    })

    return response.choices[0]?.message?.content || 'I could not generate a response. Please try again.'
  } catch (err) {
    console.error('Groq API error:', err)
    throw new Error('AI service temporarily unavailable. Please try again.')
  }
}
