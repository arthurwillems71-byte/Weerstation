#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <ArduinoJson.h>

#define uS_TO_S_FACTOR 1000000ULL
#define TIME_TO_SLEEP  900      /* 900 = 15 min, 60 = 1 min,  */

const char* ssid = "Jou wifi";
const char* password = "Jou wifi wachtworrd";
const char* supabaseUrl = "jou supabaserl";
const char* supabaseApiKey = "Jou supabaseApiKey";

// Vast IP-adres configuratie
IPAddress local_IP(1, 1, 1, 2);    
IPAddress gateway(1, 1, 1, 1);      
IPAddress subnet(255, 255, 255, 0);    
IPAddress dns(8, 8, 8, 8); // Google DNS toegevoegd

Adafruit_BME280 bme;

const int analogPin = 34; // GPIO pin voor de meting
const float R1 = 100000.0; // 100k Ohm
const float R2 = 100000.0; // 100k Ohm

void gaInDeepSleep();

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n--- ESP32 IS WAKKER ---");
  
  analogSetAttenuation(ADC_11db);
  
  // 1. Neem het gemiddelde van 20 snelle metingen tegen de ruis
  long rawSum = 0;
  for (int i = 0; i < 20; i++) {
    rawSum += analogRead(analogPin);
    delay(2); 
  }
  float rawValue = rawSum / 20.0;
  
  // 2. Bereken de spanning op de pin (ESP32 ADC_11db = ~3.6V max)
  float pinVoltage = (rawValue / 4095.0) * 3.6; 
  
  // 3. Bereken de werkelijke batterijspanning (100k/100k verdubbelt de pinspanning)
  float batteryVoltage = pinVoltage * ((R1 + R2) / R2); 
  
  // 4. Percentage berekening specifiek voor 4x AA
  // Gebruik 5.4V voor oplaadbare batterijen, of 6.0V voor gewone Alkaline batterijen
  float minVoltage = 4.0; 
  float maxVoltage = 6.0; // Pas aan naar 5.4 als je oplaadbare (NiMH) batterijen gebruikt
  float percentage = ((batteryVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100.0;
  
  // 5. Begrens de waarden netjes tussen 0 en 100%
  if (percentage > 100.0) percentage = 100.0;
  if (percentage < 0.0) percentage = 0.0;
  
  Serial.print("Batterijspanning: ");
  Serial.print(batteryVoltage);
  Serial.println(" V");
  Serial.print("Percentage: ");
  Serial.print(percentage);
  Serial.println(" %");


  Wire.begin(21, 22); 
  Serial.println("BME280 sensor zoeken...");
  if (!bme.begin(0x76, &Wire) && !bme.begin(0x77, &Wire)) {
    Serial.println("FOUT: BME280 sensor NIET gevonden! Ga in Deep Sleep...");
    delay(1000);
    gaInDeepSleep();
  }
  Serial.println("BME280 succesvol verbonden!");
  
  // Wi-Fi stabiel opstarten
  delay(200);
  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  delay(100);
  
  // Pas het zendvermogen aan om stroom-crashes te voorkomen
  WiFi.setTxPower(WIFI_POWER_11dBm);
  delay(100);

  // CORRECTIE: Configureer IP, Gateway, Subnet én DNS in één keer
  if (!WiFi.config(local_IP, gateway, subnet, dns)) {
    Serial.println("Vast IP configureren mislukt!");
  }

  Serial.print("Verbinden met Wi-Fi...");
  WiFi.begin(ssid, password);
  
  int pogingen = 0;
  while (WiFi.status() != WL_CONNECTED && pogingen < 20) {
    delay(500);
    Serial.print(".");
    pogingen++;
  }
  Serial.println("");
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi verbonden! IP-adres: ");
    Serial.println(WiFi.localIP());

    HTTPClient http;
    WiFiClientSecure client;
    
    client.setInsecure(); 
    
    if (http.begin(client, supabaseUrl)) {
      
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", supabaseApiKey);
      http.addHeader("Authorization", "Bearer " + String(supabaseApiKey));

      // Formattering voor Supabase
      StaticJsonDocument<300> jsonDoc;
      JsonArray array = jsonDoc.to<JsonArray>();
      JsonObject dataObj = array.createNestedObject();
      
      dataObj["temperatuur"] = bme.readTemperature();
      dataObj["druk"] = bme.readPressure() / 100.0F;
      dataObj["luchtvochtigheid"] = bme.readHumidity();
      dataObj["batterij"] = percentage;

      String jsonString;
      serializeJson(jsonDoc, jsonString);

      Serial.println("Data verzenden naar Supabase...");
      int httpResponseCode = http.POST(jsonString);
      
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode); 
      
      http.end();
    } else {
      Serial.println("Fout: Kon de HTTP-client niet initialiseren.");
    }
  } else {
    Serial.println("Wi-Fi verbinding mislukt (Timeout).");
  }
  
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  Serial.println("Ga in Deep Sleep...");
  delay(100);
  gaInDeepSleep();
}

void loop() {}

void gaInDeepSleep() {
  esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP * uS_TO_S_FACTOR);
  esp_deep_sleep_start();
}
S