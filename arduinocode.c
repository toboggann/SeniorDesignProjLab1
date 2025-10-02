#include <LiquidCrystal.h>
#include <OneWire.h>
#include <7semi_DS18B20.h>
#include <stdbool.h>  // Required for using `bool`, `true`, and `false`
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>

#define SERVICE_UUID "ae0ccfce-65cc-407e-9222-514870f1e987"
#define CHARACTERISTIC_UUID "daf2ff55-3641-42fe-a812-86b157ba9a28"
#define ONE_WIRE_BUS 4
DS18B20_7semi sensor(ONE_WIRE_BUS);


//rs ,enable, d4, d5, d6, d7
LiquidCrystal lcd(27, 15, 32, 33, 25, 26);

//BLE address is 38:18:2b:8b:1d:6e
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic = NULL;
bool deviceConnected= false;
bool oldDeviceConnected= false;

uint8_t temp[8];
const int sens1Button = 5;
const int sens2Button = NULL;
int button1 = 1;
int button2 = 1;
bool sens1On = false;
bool sens2On = false;
unsigned long startTime; // last time data was sent
unsigned long elapsed; // every one second
bool isCels = true;




//flag set off when something connects or disconnects
class MyServerCallbacks: public BLEServerCallbacks{
  void onConnect(BLEServer* pServer){
    deviceConnected = true;
  }

  void onDisconnect(BLEServer* pServer){
    deviceConnected = false;

  }
};

void displayTemp1(){
  lcd.setCursor(0,0); // column 0 row 0
  if(!isCels){
    t*(9/5)+32;
    lcd.print("Sensor1 Temp: ");
    lcd.print(t);
    lcd.print("°F");
    }else{
      lcd.print("Sensor1 Temp: ");
      lcd.print(t);
      lcd.print("°C");
    }
}
void sendTemp1(){

}
void displayTemp2(){
  lcd.setCursor(0,1); // column 0 row 0
  if(!isCels){
    t*(9/5)+32;
    lcd.print("Sensor2 Temp: ");
    lcd.print(t);
    lcd.print("°F");
    }else{
      lcd.print("Sensor2 Temp: ");
      lcd.print(t);
      lcd.print("°C");
    }
}
void sendTemp2(){

}

void checkSwitch1(){
  button1 = digitalRead(sens1Button);
    if(button1 == 0 && sens1On==false){
      sens1On = true
      elapsed = 1000;

    }else if(button1 == 0 && sens1On == true){
      sens1On = false
      elapsed = 1000;
    }
}
void checkSwitch2(){
  button2 = digitalRead(sens2Button);
    if(button2 == 0 && sens2On==false){
      sens2On = true
      elapsed = 1000;

    }else if(button2 == 0 && sens2On == true){
      sens2On = false
      elapsed = 1000;
    }
}



void setup() {
  lcd.begin(16, 2);
  //lcd.print("hello, world!");
  pinMode(sens1Button, INPUT_PULLUP);
  BLEDevice::init("sensors");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic = pService->createCharacteristic( CHARACTERISTIC_UUID,
                                                                      BLECharacteristic::PROPERTY_READ | 
                                                                      BLECharacteristic::PROPERTY_WRITE|
                                                                      BLECharacteristic::PROPERTY_NOTIFY|
                                                                      BLECharacteristic::PROPERTY_INDICATE);
  
  pCharacteristic->addDescriptor(new BLE2902());
  
  //pCharacteristic->setValue("Hello World says sensor");
  pService->start();
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x00);
  BLEDevice::startAdvertising();



  //finding address
  /*
  char address[20];
  strncpy(address, BLEDevice::getAddress().toString().c_str(), sizeof(address));
  address[sizeof(address)-1] = '\0';
  char first[10];
  char second[10];
  strncpy(first,address,10);
  
  strncpy(second,address+10,7);
  lcd.print(first);
  lcd.setCursor(0,1);
  lcd.print(second);
  */


  
  //Serial.begin(115200);
  if (!sensor.begin()) {
    //Serial.println("No DS18B20 found!");
    while (1)
      ;
  }
  if (!sensor.getAddress(0, temp)) {
    while(1)
      ;
  }
  //uint8_t count = sensor.searchDevices();
  //Serial.print("Found devices: ");
  //Serial.println(count);
}
 //°
void loop() {
  //connected
  if(deviceConnected){
    elapsed = millis()-startTime;
    checkSwitch1();
    checkSwitch2();
    //if it has been longer than 1 second 
    if(elapsed >= 1000){
      if(sens1On){
        float t = sensor.readTemperature(temp);
        displayTemp1();
        pCharacteristic->setValue((uint8_t*)&t, sizeof(t));
        pCharacteristic->notify();
      }else{
        lcd.setCursor(0,0);
        lcd.print("Sensor 1 Off");
      }
      if(sens2On){
        float t = sensor.readTemperature(temp);
        displayTemp2();
        pCharacteristic->setValue((uint8_t*)&t, sizeof(t));
        pCharacteristic->notify();
      }else{
        lcd.setCursor(0,1);
        lcd.print("Sensor 2 Off");
      }
      startTime = millis();
    }
      delay(10);
  }
  //disconnecting
  if(!deviceConnected && oldDeviceConnected){
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  // connecting
  if(deviceConnected && !oldDeviceConnected){
    startTime = millis();
    oldDeviceConnected = deviceConnected;
  }
}
