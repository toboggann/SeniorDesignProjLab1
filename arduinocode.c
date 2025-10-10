#include <LiquidCrystal.h>
#include <OneWire.h>
#include <7semi_DS18B20.h>
#include <stdbool.h>  // Required for using `bool`, `true`, and `false`
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <math.h>

#define SERVICE_UUID "ae0ccfce-65cc-407e-9222-514870f1e987"
#define CHARACTERISTIC_UUID_1 "daf2ff55-3641-42fe-a812-86b157ba9a28"
#define CHARACTERISTIC_UUID_2 "11111111-2222-3333-4444-555555555555"
#define ONE_WIRE_BUS_1 4
DS18B20_7semi sensor1(ONE_WIRE_BUS_1);
#define ONE_WIRE_BUS_2 13
DS18B20_7semi sensor2(ONE_WIRE_BUS_2);

//rs ,enable, d4, d5, d6, d7
LiquidCrystal lcd(27, 15, 32, 33, 25, 26);

//BLE address is 38:18:2b:8b:1d:6e
BLEServer* pServer = NULL;
BLECharacteristic* pCharacteristic1 = NULL;
BLECharacteristic* pCharacteristic2 = NULL;
bool deviceConnected= false;
bool oldDeviceConnected= false;

uint8_t temp1[8];
uint8_t temp2[8];
const int sens1Button = 5;
const int sens2Button = 18;
int button1 = 1;
int button2 = 1;
int lastButton1 = 1;
int lastButton2 = 1;
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
    pServer->startAdvertising();
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Waiting for");
    lcd.setCursor(0,1);
    lcd.print("Connection");
  }
};


void displayTemp1(float t){
  lcd.setCursor(0,0); // column 0 row 0
  if(!isCels){
    t*(9/5)+32;
    lcd.print("S1 Temp: ");
    lcd.print(t);
    lcd.write(223);
    lcd.print("F");
    }else{
      lcd.print("S1 Temp: ");
      lcd.print(t);
      lcd.write(223);
      lcd.print("C");
    }
}
void sendTemp1(float t){
  uint8_t buf1[4];
  memcpy(buf1, &t, sizeof(t));
  pCharacteristic1->setValue(buf1, sizeof(buf1));
  pCharacteristic1->notify();
}
void displayTemp2(float t){
  lcd.setCursor(0,1); // column 0 row 0
  if(!isCels){
    t*(9/5)+32;
    lcd.print("S2 Temp: ");
    lcd.print(t);
    lcd.write(223);
    lcd.print("F");
    }else{
      lcd.print("S2 Temp: ");
      lcd.print(t);
      lcd.write(223);
      lcd.print("C");
    }
}
void sendTemp2(float t){
  uint8_t buf2[4];
  memcpy(buf2, &t, sizeof(t));
  pCharacteristic2->setValue(buf2, sizeof(buf2));
  pCharacteristic2->notify();
}

void sendNan1(){
  uint8_t buf1[4];
  uint32_t nanBits = 0x7FC00000; // standard 32-bit float NaN
  memcpy(buf1, &nanBits, 4);
  pCharacteristic1->setValue(buf1, 4);
  pCharacteristic1->notify();
}
void sendNan2(){
  uint8_t buf2[4];
  uint32_t nanBits = 0x7FC00000; // standard 32-bit float NaN
  memcpy(buf2, &nanBits, 4);
  pCharacteristic2->setValue(buf2, 4);
  pCharacteristic2->notify();
}

void checkSwitch1(){
  button1 = digitalRead(sens1Button);
  if(button1 == 0 && lastButton1 == 1) { // button just pressed
    sens1On = !sens1On; // toggle
    elapsed = 1000;
  }
  lastButton1 = button1; // save current state
}
void checkSwitch2(){
  button2 = digitalRead(sens2Button);
  if(button2 == 0 && lastButton2 == 1) { // button just pressed
    sens2On = !sens2On; // toggle
    elapsed = 1000;
  }
  lastButton2 = button2; // save current state
  
}



void setup() {
  lcd.begin(16, 2);
  lcd.setCursor(0,0);
  //lcd.print("hello, world!");
  pinMode(sens1Button, INPUT_PULLUP);
  BLEDevice::init("sensors");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pCharacteristic1 = pService->createCharacteristic( CHARACTERISTIC_UUID_1,
                                                                      BLECharacteristic::PROPERTY_READ | 
                                                                      BLECharacteristic::PROPERTY_WRITE|
                                                                      BLECharacteristic::PROPERTY_NOTIFY|
                                                                      BLECharacteristic::PROPERTY_INDICATE);
  
  pCharacteristic1->addDescriptor(new BLE2902());

  pCharacteristic2 = pService->createCharacteristic( CHARACTERISTIC_UUID_2,
                                                                      BLECharacteristic::PROPERTY_READ | 
                                                                      BLECharacteristic::PROPERTY_WRITE|
                                                                      BLECharacteristic::PROPERTY_NOTIFY|
                                                                      BLECharacteristic::PROPERTY_INDICATE);

  pCharacteristic2->addDescriptor(new BLE2902());
  
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
  if (!sensor1.begin()) {
    lcd.print("No DS18B20 found!");
    while (1)
      ;
  }
  if (!sensor1.getAddress(0, temp1)) {
    lcd.print("help");
    while(1)
      ;
  }
  if (!sensor2.begin()) {
    lcd.print("No DS18B20 found!");
    while (1)
      ;
  }
  if (!sensor2.getAddress(0, temp2)) {
    lcd.print("help");
    while(1)
      ;
  }
  
}
 //°
void loop() {
  //connected
  if(deviceConnected){
    lcd.setCursor(0,0); // column 0 row 0
    //if(!isCels){
    elapsed = millis()-startTime;
    checkSwitch1();
    checkSwitch2();
    //if it has been longer than 1 second 
    if(elapsed >= 1000){
      if(sens1On){
        float t1 = sensor1.readTemperature(temp1);
        sendTemp1(t1);
        displayTemp1(t1);
      }else{
        lcd.setCursor(0,0);
        lcd.print("Sensor 1 Off    ");
        sendNan1();
      }
      delay(100);
      if(sens2On){
        float t2 = sensor2.readTemperature(temp2);
        sendTemp2(t2);
        displayTemp2(t2);
      }else{
        lcd.setCursor(0,1);
        lcd.print("Sensor 2 Off    ");
        sendNan2();
      }
      startTime = millis();
    }
      delay(10);
  }
  

  //disconnecting
  if(!deviceConnected && oldDeviceConnected){
    delay(500);
    oldDeviceConnected = deviceConnected;
  }
  // connecting
  if(deviceConnected && !oldDeviceConnected){
    startTime = millis();
    oldDeviceConnected = deviceConnected;
  }
}