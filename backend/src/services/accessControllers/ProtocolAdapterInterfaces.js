const { BaseAccessControllerAdapter } = require('./BaseAccessControllerAdapter');

/**
 * Capability-gated adapter interfaces for transport protocols whose exact
 * vendor framing/SDK is not yet bound. They fail closed and never emit
 * unverified or generic commands to unknown hardware.
 */
class TcpIpAccessControllerAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      protocol: 'TCP_IP',
      implemented: false,
      note: 'Requires vendor TCP/IP packet framing specification before enabling.',
    };
  }
}

class WebSocketAccessControllerAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      protocol: 'WEBSOCKET',
      implemented: false,
      note: 'Requires vendor WebSocket message schema before enabling.',
    };
  }
}

class Rs485GatewayAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      protocol: 'RS485_GATEWAY',
      implemented: false,
      note: 'Requires RS-485/Modbus/Wiegand bridge register map before enabling.',
    };
  }
}

class VendorSdkAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      protocol: 'VENDOR_SDK',
      implemented: false,
      note: 'Requires vendor-specific SDK package and documented API binding.',
    };
  }
}

class LocalRelayGpioAdapter extends BaseAccessControllerAdapter {
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      protocol: 'LOCAL_RELAY_GPIO',
      implemented: false,
      note: 'Requires local edge relay/GPIO daemon endpoint and hardware pin verification.',
    };
  }
}

module.exports = {
  TcpIpAccessControllerAdapter,
  WebSocketAccessControllerAdapter,
  Rs485GatewayAdapter,
  VendorSdkAdapter,
  LocalRelayGpioAdapter,
};
