const payloadTypes = {
  COMFORT_SENSOR: 0x01,
  PEOPLE_COUNTER: 0x02,
  BUTTONS: 0x03,
  PULSE_COUNTER: 0x04,
  TRACKER: 0x05,
  DOWNLINK: 0xf1,
};

const errorCode = {
  UNKNOWN_PAYLOAD: 1,
  EXPECTED_DOWNLINK_RESPONSE: 2,
  UNKNOWN_PAYLOAD_TYPE: 3,
  UNKNOWN_PAYLOAD_VARIANT: 4,
};

function decodeUplink(input) {
  let parsedData = {};
  if (!containsIMBHeader(input.bytes)) {
    //When payload doesn't contain IMBuildings header
    //Assumes that payload is transmitted on specific recommended fport
    //e.g. payload type 2 variant 6 on FPort 26, type 2 variant 7 on FPort 27 and so on...
    switch (input.fPort) {
      case 10:
        //Assumes data is response from downlink
        if (input.bytes[0] != payloadTypes.DOWNLINK || input.bytes[1] != 0x01)
          return getError(errorCode.EXPECTED_DOWNLINK_RESPONSE);
        parsedData.payload_type = payloadTypes.DOWNLINK;
        parsedData.payload_variant = 0x01;
        break;
      case 11:
        if (input.bytes.length != 7) return getError(errorCode.UNKNOWN_PAYLOAD);
        parsedData.payload_type = payloadTypes.COMFORT_SENSOR;
        parsedData.payload_variant = 1;
        input.payloadHeader = false;
        break;
      case 13:
        if (input.bytes.length != 7) return getError(errorCode.UNKNOWN_PAYLOAD);

        parsedData.payload_type = payloadTypes.COMFORT_SENSOR;
        parsedData.payload_variant = 3;
        break;
      case 24:
        if (input.bytes.length != 12)
          return getError(errorCode.UNKNOWN_PAYLOAD);
        parsedData.payload_type = payloadTypes.PEOPLE_COUNTER;
        parsedData.payload_variant = 4;
        input.payloadHeader = false;
        break;
      case 26:
        if (input.bytes.length != 13)
          return getError(errorCode.UNKNOWN_PAYLOAD);

        parsedData.payload_type = payloadTypes.PEOPLE_COUNTER;
        parsedData.payload_variant = 6;
        break;
      case 27:
        if (input.bytes.length != 5) return getError(errorCode.UNKNOWN_PAYLOAD);

        parsedData.payload_type = payloadTypes.PEOPLE_COUNTER;
        parsedData.payload_variant = 7;
        break;
      case 28:
        if (input.bytes.length != 4) return getError(errorCode.UNKNOWN_PAYLOAD);

        parsedData.payload_type = payloadTypes.PEOPLE_COUNTER;
        parsedData.payload_variant = 8;
        break;
      case 33:
        if (input.bytes.length != 1) return getError(errorCode.UNKNOWN_PAYLOAD);
        parsedData.payload_type = payloadTypes.BUTTONS;
        parsedData.payload_variant = 3;
        input.payloadHeader = false;
        break;
      case 34:
        if (input.bytes.length != 10)
          return getError(errorCode.UNKNOWN_PAYLOAD);
        parsedData.payload_type = payloadTypes.BUTTONS;
        parsedData.payload_variant = 4;
        input.payloadHeader = false;
        break;
      default:
        return {errors: []};
    }
  } else {
    parsedData.payload_type = input.bytes[0];
    parsedData.payload_variant = input.bytes[1];
    parsedData.device_id = toHEXString(input.bytes, 2, 8);
  }

  switch (parsedData.payload_type) {
    case payloadTypes.PEOPLE_COUNTER:
      parsePeopleCounter(input, parsedData);
      break;
    default:
      return getError(errorCode.UNKNOWN_PAYLOAD_TYPE);
  }

  return {data: parsedData};
}

function containsIMBHeader(payload) {
  if (
    payload[0] == payloadTypes.PEOPLE_COUNTER &&
    payload[1] == 0x04 &&
    payload.length == 24
  )
    return true;
  if (
    payload[0] == payloadTypes.PEOPLE_COUNTER &&
    payload[1] == 0x06 &&
    payload.length == 23
  )
    return true;
  if (
    payload[0] == payloadTypes.PEOPLE_COUNTER &&
    payload[1] == 0x07 &&
    payload.length == 15
  )
    return true;
  if (
    payload[0] == payloadTypes.PEOPLE_COUNTER &&
    payload[1] == 0x08 &&
    payload.length == 14
  )
    return true;

  return false;
}

function parsePeopleCounter(input, parsedData) {
  switch (parsedData.payload_variant) {
    case 0x04:
      if (input.payloadHeader !== false) {
        parsedData.device_id = toHEXString(input.bytes, 2, 6);
        parsedData.device_status = input.bytes[8];
        parsedData.battery_voltage = readUInt16BE(input.bytes, 9) / 100;
        parsedData.rssi = readInt8(input.bytes, 11);
      }
      let datetime = Date.UTC(
        unbcd(input.bytes[input.bytes.length - 12]) * 100 +
          unbcd(input.bytes[input.bytes.length - 11]),
        unbcd(input.bytes[input.bytes.length - 10]) - 1,
        unbcd(input.bytes[input.bytes.length - 9]),
        unbcd(input.bytes[input.bytes.length - 8]),
        unbcd(input.bytes[input.bytes.length - 7]),
        unbcd(input.bytes[input.bytes.length - 6])
      );

      parsedData.datetime = new Date(datetime).toISOString();
      parsedData.counter_a = readUInt16BE(input.bytes, input.bytes.length - 5);
      parsedData.counter_b = readUInt16BE(input.bytes, input.bytes.length - 3);
      parsedData.sensor_status = input.bytes[input.bytes.length - 1];
      break;
    case 0x06:
      parsedData.device_status = input.bytes[input.bytes.length - 13];
      parsedData.battery_voltage =
        readUInt16BE(input.bytes, input.bytes.length - 12) / 100;
      parsedData.counter_a = readUInt16BE(input.bytes, input.bytes.length - 10);
      parsedData.counter_b = readUInt16BE(input.bytes, input.bytes.length - 8);
      parsedData.sensor_status = input.bytes[input.bytes.length - 6];
      parsedData.total_counter_a = readUInt16BE(
        input.bytes,
        input.bytes.length - 5
      );
      parsedData.total_counter_b = readUInt16BE(
        input.bytes,
        input.bytes.length - 3
      );
      parsedData.payload_counter = input.bytes[input.bytes.length - 1];
      break;
    case 0x07:
      parsedData.sensor_status = input.bytes[input.bytes.length - 5];
      parsedData.total_counter_a = readUInt16BE(
        input.bytes,
        input.bytes.length - 4
      );
      parsedData.total_counter_b = readUInt16BE(
        input.bytes,
        input.bytes.length - 2
      );
      break;
    case 0x08:
      parsedData.device_status = input.bytes[input.bytes.length - 4];
      parsedData.battery_voltage =
        readUInt16BE(input.bytes, input.bytes.length - 3) / 100;
      parsedData.sensor_status = input.bytes[input.bytes.length - 1];
      break;
  }
}

// Helper functions
function getError(code) {
  switch (code) {
    case errorCode.UNKNOWN_PAYLOAD:
      return {
        errors: [
          "Unable to detect correct payload. Please check your device configuration",
        ],
      };
    case errorCode.EXPECTED_DOWNLINK_RESPONSE:
      return {
        errors: [
          "Expected downlink reponse data on FPort 10. Please transmit downlinks on FPort 10",
        ],
      };
    case errorCode.UNKNOWN_PAYLOAD_TYPE:
      return {errors: ["Unknown payload type"]};
    case errorCode.UNKNOWN_PAYLOAD_VARIANT:
      return {errors: ["Unknown payload variant"]};
  }
}

function unbcd(bcd) {
  return (bcd >> 4) * 10 + (bcd % 16);
}

function toHEXString(payload, index, length) {
  var HEXString = "";

  for (var i = 0; i < length; i++) {
    if (payload[index + i] < 16) {
      HEXString = HEXString + "0";
    }
    HEXString = HEXString + payload[index + i].toString(16);
  }

  return HEXString;
}

function readUInt16BE(payload, index) {
  return (payload[index] << 8) + payload[++index];
}

function readInt8(payload, index) {
  var int8 = payload[index];

  if (int8 & 0x80) {
    int8 = -(0x100 - int8);
  }

  return int8;
}

// Remove the lines below before using on TTN
module.exports.decode = function (input) {
  return Object.assign(
    {received_at: new Date().toISOString()},
    decodeUplink(input).data
  );
};
