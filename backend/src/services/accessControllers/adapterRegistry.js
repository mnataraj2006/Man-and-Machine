const MockAccessControllerAdapter = require('./MockAccessControllerAdapter');
const HttpRestAccessControllerAdapter = require('./HttpRestAccessControllerAdapter');
const {
  TcpIpAccessControllerAdapter,
  WebSocketAccessControllerAdapter,
  Rs485GatewayAdapter,
  VendorSdkAdapter,
  LocalRelayGpioAdapter,
} = require('./ProtocolAdapterInterfaces');

const ADAPTER_CATALOG = [
  {
    adapterType: 'MOCK',
    label: 'Mock / Simulation Controller',
    transport: 'IN_MEMORY',
    implemented: true,
    description: 'Safe simulation adapter for development, testing, and failure-mode verification.',
  },
  {
    adapterType: 'HTTP_REST',
    label: 'HTTP / REST API Controller',
    transport: 'HTTPS / HTTP',
    implemented: true,
    description: 'Authenticated REST gateway (/health, /info, /unlock) with timeout & TLS support.',
  },
  {
    adapterType: 'TCP_IP',
    label: 'TCP/IP Socket Controller',
    transport: 'RAW_TCP',
    implemented: false,
    description: 'Interface ready; requires vendor TCP packet framing specification.',
  },
  {
    adapterType: 'WEBSOCKET',
    label: 'WebSocket Controller',
    transport: 'WSS / WS',
    implemented: false,
    description: 'Interface ready; requires vendor WebSocket message schema.',
  },
  {
    adapterType: 'RS485_GATEWAY',
    label: 'RS-485 / Serial Gateway',
    transport: 'SERIAL / MODBUS',
    implemented: false,
    description: 'Interface ready; requires RS-485 bridge and register/baud specification.',
  },
  {
    adapterType: 'VENDOR_SDK',
    label: 'Vendor SDK Integration',
    transport: 'NATIVE_SDK',
    implemented: false,
    description: 'Interface ready; requires manufacturer SDK library and license.',
  },
  {
    adapterType: 'LOCAL_RELAY_GPIO',
    label: 'Local Relay / GPIO Gateway',
    transport: 'EDGE_GPIO',
    implemented: false,
    description: 'Interface ready; requires local edge relay daemon & fail-safe wiring.',
  },
];

const ADAPTER_MAP = {
  MOCK: MockAccessControllerAdapter,
  HTTP_REST: HttpRestAccessControllerAdapter,
  TCP_IP: TcpIpAccessControllerAdapter,
  WEBSOCKET: WebSocketAccessControllerAdapter,
  RS485_GATEWAY: Rs485GatewayAdapter,
  VENDOR_SDK: VendorSdkAdapter,
  LOCAL_RELAY_GPIO: LocalRelayGpioAdapter,
};

const HARDWARE_DISCOVERY_CHECKLIST = [
  'Manufacturer name, exact model number, and PCB/firmware revision',
  'Physical wiring topology (eSSL X2008 Wiegand/RS-485/relay vs standalone network controller)',
  'Supported communication interface (Ethernet TCP/IP, HTTP/REST, RS-485, Wiegand, or dry-contact relay)',
  'Authentication mechanism (TLS, API key, digest/HMAC, or vendor SDK credentials)',
  'Whether a door-open / magnetic reed sensor is wired to confirm physical unlock state',
  'Independent fail-safe emergency egress (push-to-exit button / fire-alarm break-glass) verification',
];

const createAdapterForController = (controller, credentials = {}) => {
  const AdapterClass = ADAPTER_MAP[controller?.adapterType];
  if (!AdapterClass) {
    const err = new Error(`Unsupported access controller adapter type: ${controller?.adapterType}`);
    err.statusCode = 400;
    throw err;
  }
  return new AdapterClass(controller, credentials);
};

module.exports = {
  ADAPTER_CATALOG,
  HARDWARE_DISCOVERY_CHECKLIST,
  createAdapterForController,
};
