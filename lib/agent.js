import Groq from 'groq-sdk'
import { supabaseAdmin } from './supabase'
import { hashPassword } from './auth'

const client = new Groq({ apiKey: process.env.GROQ_API_KEY })

const MODEL = 'llama-3.3-70b-versatile'
const MAX_ITERATIONS = 5

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const SYSTEM_PROMPTS = {
  admin: `You are an intelligent IoT platform AI assistant for ADMIN users.
You have FULL access to all devices, users, and controls on the platform.
ALWAYS use tools to fetch real-time data before answering — never guess device states.
You can control any device and manage all users.
When a user asks to control a device, use get_devices first to find the device ID, then call control_device.
Be concise and action-oriented.`,

  support: `You are an IoT platform AI assistant for SUPPORT users.
You have READ-ONLY access. You CAN view all devices and users but CANNOT control devices or create users.
ALWAYS use get_devices or get_device_readings to fetch real-time data before answering.
If asked to control a device, clearly explain that support users cannot control devices and suggest the customer logs in to do it.`,

  customer: `You are a personal IoT assistant for this customer.
You can ONLY access and control devices that belong to this customer.
ALWAYS use get_devices to check current status before answering.
Use control_device to act on devices when the customer asks.
Be friendly and confirm every action you take.`,
}

// ─── TOOL DEFINITIONS ─────────────────────────────────────────────────────────

const TOOLS = {
  get_devices: {
    type: 'function',
    function: {
      name: 'get_devices',
      description: 'Fetch IoT devices with real-time status. Admin and support see all devices with customer info. Customer sees only their own devices.',
      parameters: {
        type: 'object',
        properties: {
          status_filter: {
            type: 'string',
            enum: ['online', 'offline', 'error', 'all'],
            description: 'Filter devices by connection status. Default is all.',
          },
        },
        required: [],
      },
    },
  },

  get_device_readings: {
    type: 'function',
    function: {
      name: 'get_device_readings',
      description: 'Get the latest sensor readings and history for a specific device (temperature, humidity, power, brightness, lock state, etc.).',
      parameters: {
        type: 'object',
        properties: {
          device_id: {
            type: 'string',
            description: 'The UUID of the device to get readings for.',
          },
        },
        required: ['device_id'],
      },
    },
  },

  control_device: {
    type: 'function',
    function: {
      name: 'control_device',
      description: 'Send a control command to an IoT device. Not available to support users. Customers can only control their own devices.',
      parameters: {
        type: 'object',
        properties: {
          device_id: {
            type: 'string',
            description: 'The UUID of the device to control.',
          },
          command: {
            type: 'string',
            enum: ['turn_on', 'turn_off', 'set_brightness', 'set_temperature', 'lock', 'unlock'],
            description: 'The command to send to the device.',
          },
          params: {
            type: 'object',
            description: 'Optional command parameters. For set_brightness: { brightness: 0-100 }. For set_temperature: { temperature: 16-30 }.',
          },
        },
        required: ['device_id', 'command'],
      },
    },
  },

  get_users: {
    type: 'function',
    function: {
      name: 'get_users',
      description: 'Get list of all users on the platform with their device counts. Admin only.',
      parameters: {
        type: 'object',
        properties: {
          role_filter: {
            type: 'string',
            enum: ['admin', 'support', 'customer', 'all'],
            description: 'Filter users by role. Default is all.',
          },
        },
        required: [],
      },
    },
  },

  create_user: {
    type: 'function',
    function: {
      name: 'create_user',
      description: 'Create a new support user or customer account. Admin only.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the user.' },
          email: { type: 'string', description: 'Email address (must be unique).' },
          password: { type: 'string', description: 'Initial password for the account.' },
          role: { type: 'string', enum: ['support', 'customer'], description: 'Role to assign.' },
        },
        required: ['name', 'email', 'password', 'role'],
      },
    },
  },
}

// Role-based tool access
function getToolsForRole(role) {
  if (role === 'admin') {
    return Object.values(TOOLS)
  }
  if (role === 'support') {
    return [TOOLS.get_devices, TOOLS.get_device_readings, TOOLS.get_users]
  }
  if (role === 'customer') {
    return [TOOLS.get_devices, TOOLS.get_device_readings, TOOLS.control_device]
  }
  return [TOOLS.get_devices, TOOLS.get_device_readings]
}

// ─── TOOL EXECUTORS ───────────────────────────────────────────────────────────

async function executeGetDevices(args, userContext) {
  const { userId, role } = userContext

  let query = supabaseAdmin
    .from('devices')
    .select('id, name, type, status, is_on, settings, location, customer_id, updated_at, users:customer_id(name, email)')

  if (role === 'customer') {
    query = query.eq('customer_id', userId)
  }

  if (args?.status_filter && args.status_filter !== 'all') {
    query = query.eq('status', args.status_filter)
  }

  const { data, error } = await query.order('updated_at', { ascending: false })

  if (error) return { error: error.message }

  return {
    devices: data || [],
    total: data?.length || 0,
    online: data?.filter((d) => d.status === 'online').length || 0,
    offline: data?.filter((d) => d.status === 'offline').length || 0,
    error_count: data?.filter((d) => d.status === 'error').length || 0,
  }
}

async function executeGetDeviceReadings(args, userContext) {
  const { userId, role } = userContext

  const { data: device, error: deviceError } = await supabaseAdmin
    .from('devices')
    .select('id, name, type, status, is_on, settings, customer_id')
    .eq('id', args.device_id)
    .single()

  if (deviceError || !device) return { error: 'Device not found' }

  if (role === 'customer' && device.customer_id !== userId) {
    return { error: 'Access denied: this device does not belong to you' }
  }

  const { data: readings } = await supabaseAdmin
    .from('device_readings')
    .select('*')
    .eq('device_id', args.device_id)
    .order('recorded_at', { ascending: false })
    .limit(12)

  return {
    device: {
      name: device.name,
      type: device.type,
      status: device.status,
      is_on: device.is_on,
      settings: device.settings,
    },
    latest_readings: readings || [],
    reading_count: readings?.length || 0,
  }
}

async function executeControlDevice(args, userContext) {
  const { userId, role } = userContext

  if (role === 'support') {
    return { error: 'Support users cannot control devices. The customer must log in to control their devices.' }
  }

  const { data: device, error: deviceError } = await supabaseAdmin
    .from('devices')
    .select('*')
    .eq('id', args.device_id)
    .single()

  if (deviceError || !device) return { error: 'Device not found' }

  if (role === 'customer' && device.customer_id !== userId) {
    return { error: 'Access denied: this device does not belong to you' }
  }

  const typeCommandMap = {
    temperature_sensor: [],
    smart_switch: ['turn_on', 'turn_off'],
    smart_bulb: ['turn_on', 'turn_off', 'set_brightness'],
    thermostat: ['turn_on', 'turn_off', 'set_temperature'],
    smart_lock: ['lock', 'unlock'],
  }

  const allowed = typeCommandMap[device.type] || []
  if (!allowed.includes(args.command)) {
    return { error: `Command '${args.command}' is not valid for device type '${device.type}'. Allowed: ${allowed.join(', ')}` }
  }

  const updates = { updated_at: new Date().toISOString() }

  if (args.command === 'turn_on') { updates.is_on = true; updates.status = 'online' }
  else if (args.command === 'turn_off') { updates.is_on = false; updates.status = 'online' }
  else if (args.command === 'set_brightness') {
    const brightness = args.params?.brightness ?? 100
    updates.settings = { ...device.settings, brightness }
    updates.is_on = brightness > 0
  }
  else if (args.command === 'set_temperature') {
    updates.settings = { ...device.settings, target_temperature: args.params?.temperature ?? 22 }
  }
  else if (args.command === 'lock') { updates.settings = { ...device.settings, is_locked: true } }
  else if (args.command === 'unlock') { updates.settings = { ...device.settings, is_locked: false } }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('devices')
    .update(updates)
    .eq('id', args.device_id)
    .select('*')
    .single()

  if (updateError) return { error: updateError.message }

  await supabaseAdmin.from('device_commands').insert({
    device_id: args.device_id,
    command: args.command,
    params: args.params || {},
    issued_by: userId,
  }).catch(console.error)

  return {
    success: true,
    message: `Command '${args.command}' sent to '${device.name}' successfully.`,
    device_name: device.name,
    command: args.command,
    new_state: { is_on: updated.is_on, status: updated.status, settings: updated.settings },
  }
}

async function executeGetUsers(args, userContext) {
  const { role } = userContext

  if (role !== 'admin') return { error: 'Admin access required to view users' }

  let query = supabaseAdmin
    .from('users')
    .select('id, name, email, role, is_active, created_at')

  if (args?.role_filter && args.role_filter !== 'all') {
    query = query.eq('role', args.role_filter)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return { error: error.message }

  // Attach device count for customers
  const withCounts = await Promise.all(
    (data || []).map(async (user) => {
      if (user.role === 'customer') {
        const { count } = await supabaseAdmin
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .eq('customer_id', user.id)
        return { ...user, device_count: count || 0 }
      }
      return user
    })
  )

  return {
    users: withCounts,
    total: withCounts.length,
    admins: withCounts.filter((u) => u.role === 'admin').length,
    support: withCounts.filter((u) => u.role === 'support').length,
    customers: withCounts.filter((u) => u.role === 'customer').length,
  }
}

async function executeCreateUser(args, userContext) {
  const { userId, role } = userContext

  if (role !== 'admin') return { error: 'Admin access required to create users' }

  try {
    const password_hash = await hashPassword(args.password)
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        name: args.name,
        email: args.email,
        password_hash,
        role: args.role,
        created_by: userId,
        is_active: true,
      })
      .select('id, name, email, role, created_at')
      .single()

    if (error) {
      if (error.code === '23505') return { error: 'A user with this email already exists' }
      return { error: error.message }
    }

    return { success: true, message: `User '${data.name}' created as ${data.role}.`, user: data }
  } catch (err) {
    return { error: err.message }
  }
}

// Tool dispatcher
async function executeTool(name, args, userContext) {
  switch (name) {
    case 'get_devices': return executeGetDevices(args, userContext)
    case 'get_device_readings': return executeGetDeviceReadings(args, userContext)
    case 'control_device': return executeControlDevice(args, userContext)
    case 'get_users': return executeGetUsers(args, userContext)
    case 'create_user': return executeCreateUser(args, userContext)
    default: return { error: `Unknown tool: ${name}` }
  }
}

// ─── MAIN AGENT RUNNER ────────────────────────────────────────────────────────

export async function runAgent(userMessage, conversationHistory, userContext) {
  const { role } = userContext
  const tools = getToolsForRole(role)
  const systemPrompt = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.customer

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10),
    { role: 'user', content: userMessage },
  ]

  const toolCallLog = []

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      temperature: 0.3,
      max_tokens: 1024,
    })

    const choice = response.choices[0]
    const assistantMessage = choice.message

    messages.push(assistantMessage)

    // No tool calls — final answer
    if (choice.finish_reason === 'stop' || !assistantMessage.tool_calls?.length) {
      return {
        response: assistantMessage.content || 'Done.',
        toolCallLog,
      }
    }

    // Execute tool calls in parallel
    const toolResults = await Promise.all(
      assistantMessage.tool_calls.map(async (toolCall) => {
        const name = toolCall.function.name
        let args = {}
        try {
          args = JSON.parse(toolCall.function.arguments || '{}') || {}
        } catch {
          args = {}
        }

        toolCallLog.push({ tool: name, args, tool_call_id: toolCall.id })

        const result = await executeTool(name, args, userContext)

        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        }
      })
    )

    messages.push(...toolResults)
  }

  return {
    response: 'I reached the maximum number of steps. Please try a simpler request.',
    toolCallLog,
  }
}
