import asyncio
from bleak import BleakClient
from bleak import BleakScanner
import struct
import json
from datetime import datetime
import os
import math

# Replace with your ESP32's BLE MAC address (Windows shows it as "Device Address")
address = "BC167CF6-D400-92B7-1D15-9F46DDB4C78A"  
print("running pythoncode.py")
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
        
        # Determine which unit to use based on sensor name
        unit_key = "unit1" if sensor_name == "sensor1" else "unit2"
        
        # Try to read unit from power.json
        unit = "celsius"  # default value
        try:
            power_json_path = './Scripts/power.json'
            if os.path.exists(power_json_path) and os.path.getsize(power_json_path) > 0:
                with open(power_json_path, 'r') as f:
                    power_data = json.load(f)
                    unit = power_data.get(unit_key, "celsius")
        except (json.JSONDecodeError, FileNotFoundError, KeyError):
            unit = "celsius"  # fallback to default
        
        # Create reading structure
        reading = {
            "timestamp": datetime.now().isoformat(),
            "temperature": temperature,
            "sensor": sensor_name,
            "unit": unit
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
    

def is_nan_float(value_bytes):
    """
    Check if the bytes represent a NaN float value
    """
    try:
        # Try to unpack as float
        float_value = struct.unpack('f', value_bytes)[0]

        # Check if it's NaN using math.isnan()
        #print(float_value)

        return math.isnan(float_value)
    except:
        return False


async def main():
    async with BleakClient(address) as client:
        connected = client.is_connected
        print(f"Connected: {connected}")
        
        while True:
            await asyncio.sleep(1.0)  # read every 1 second
            
            # Read the characteristic
            value1 = await client.read_gatt_char(CHAR_UUID1)
            print("Sensor 1 - Raw bytes:", value1)

            value2 = await client.read_gatt_char(CHAR_UUID2)
            print("Sensor 2 - Raw bytes:", value2)

            # Check for NaN before converting
            if is_nan_float(value1):
                temperature1 = 'nan'
                #print("Sensor 1 Temperature: nan")
            else:
                temperature1 = struct.unpack('f', value1)[0]
                #print(f"Sensor 1 Temperature: {temperature1:.2f}")

            if is_nan_float(value2):
                temperature2 = 'nan'
                #print("Sensor 2 Temperature: nan")
            else:
                temperature2 = struct.unpack('f', value2)[0]
                #print(f"Sensor 2 Temperature: {temperature2:.2f}")
            
            # Save to JSON files
            save_to_json(temperature1, './Scripts/temp1.json', 'sensor1')
            save_to_json(temperature2, './Scripts/temp2.json', 'sensor2')
            #print()  # Empty line for better readability
            #print("saved 1 and 2")


asyncio.run(main())