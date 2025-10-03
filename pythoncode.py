import asyncio
from bleak import BleakClient
from bleak import BleakScanner
import struct
import json
from datetime import datetime
import os

# Replace with your ESP32's BLE MAC address (Windows shows it as "Device Address")
address = "BC167CF6-D400-92B7-1D15-9F46DDB4C78A"  

# Replace with the characteristic UUID from your ESP32 code
CHAR_UUID1 = "daf2ff55-3641-42fe-a812-86b157ba9a28"
CHAR_UUID2 = "11111111-2222-3333-4444-555555555555"

def save_to_json(temperature, filename, sensor_name):
    """
    Save temperature data to JSON file
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # Create reading structure
        reading = {
            "timestamp": datetime.now().isoformat(),
            "temperature": temperature,
            "sensor": sensor_name,
            "unit": "celsius"
        }
        
        # Read existing data or create new structure
        data = None
        try:
            # Check if file exists and has content
            if os.path.exists(filename) and os.path.getsize(filename) > 0:
                with open(filename, 'r') as f:
                    data = json.load(f)
            else:
                # File doesn't exist or is empty
                data = {
                    "sensor_id": sensor_name,
                    "sensor_name": f"Temperature {sensor_name}",
                    "readings": []
                }
        except (json.JSONDecodeError, FileNotFoundError):
            # Handle corrupted JSON or file not found
            data = {
                "sensor_id": sensor_name,
                "sensor_name": f"Temperature {sensor_name}",
                "readings": []
            }
        
        # Add new reading and maintain 300 reading limit
        data["readings"].append(reading)
        if len(data["readings"]) > 300:
            data["readings"] = data["readings"][-300:]
        
        # Update metadata
        data["last_updated"] = datetime.now().isoformat()
        data["total_readings"] = len(data["readings"])
        data["current_temperature"] = temperature
        
        # Save back to file
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2)
        
        #print(f" Saved {sensor_name}: {temperature:.2f}°C to {filename}")
        return True
        
    except Exception as e:
        print(f"Failed to save {sensor_name}: {e}")
        return False

async def main():
    async with BleakClient(address) as client:
        connected = client.is_connected
        print(f"Connected: {connected}")
        
        while True:
            await asyncio.sleep(1.0)  # read every 1 second
            
            # Read the characteristic
            value1 = await client.read_gatt_char(CHAR_UUID1)
            #print("Sensor 1 - Raw bytes:", value1)

            value2 = await client.read_gatt_char(CHAR_UUID2)
            #print("Sensor 2 - Raw bytes:", value2)

            # Convert bytes to float
            temperature1 = struct.unpack('f', value1)[0]
            #print("Received float temperature 1:", temperature1)
            temperature2 = struct.unpack('f', value2)[0]
            #print("Received float temperature 2:", temperature2)
            
            # Save to JSON files
            save_to_json(temperature1, './Scripts/temp1.json', 'sensor1')
            save_to_json(temperature2, './Scripts/temp2.json', 'sensor2')
            #print()  # Empty line for better readability
            print("saved 1 and 2")


asyncio.run(main())