import asyncio
from bleak import BleakClient
from bleak import BleakScanner
import struct

# Replace with your ESP32's BLE MAC address (Windows shows it as "Device Address")
address = "BC167CF6-D400-92B7-1D15-9F46DDB4C78A"  

# Replace with the characteristic UUID from your ESP32 code
CHAR_UUID1 = "daf2ff55-3641-42fe-a812-86b157ba9a28"
CHAR_UUID2 = "11111111-2222-3333-4444-555555555555"

async def main():
    """""
    print("Scanning for BLE devices...")
    devices = await BleakScanner.discover(timeout=5.0)
    for d in devices:
        print(d)
    """""
    async with BleakClient(address) as client:
        connected = client.is_connected
        print(f"Connected: {connected}")
        while(1):
            await asyncio.sleep(1.0)  # read every 1 second
            # Read the characteristic
            value1 = await client.read_gatt_char(CHAR_UUID1)
            print("Received raw bytes:", value1)

            value2 = await client.read_gatt_char(CHAR_UUID2)
            print("Received raw bytes:", value2)

            # Convert bytes to float
            temperature1 = struct.unpack('f', value1)[0]
            print("Received float temperature:", temperature1)
            temperature2 = struct.unpack('f', value2)[0]
            print("Received float temperature:", temperature2)
        

asyncio.run(main())