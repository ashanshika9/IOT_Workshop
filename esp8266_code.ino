/*
  SISTec IoT Application 2026 - ESP8266 Code
  Hardware: 
  - ESP8266
  - DHT11 (Pin D5)
  - LCD 16x2 I2C (SDA: D2, SCL: D1, Address: 0x27)
*/

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- WiFi Credentials ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- Server URL ---
const String serverURL = "https://your-app-name.onrender.com"; 

// --- Pin Definitions ---
#define DHTPIN D5
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  
  // LCD Init
  lcd.init();
  lcd.backlight();
  
  // Connect to WiFi
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    lcd.print(".");
    Serial.print(".");
  }
  
  lcd.clear();
  lcd.print("CONNECTED TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");
  delay(1000);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("-- WELCOME --");
  delay(2000);
  
  dht.begin();
}

void loop() {
  // 1. Read DHT11
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (isnan(h) || isnan(t)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  // 2. Display Temp
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE");
  lcd.setCursor(0, 1);
  lcd.print(String(t) + " 'C");
  delay(2000);

  // 3. Display Humidity
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY");
  lcd.setCursor(0, 1);
  lcd.print(String(h) + "%");
  delay(2000);

  // 4. Fetch Text from API (API 2)
  String lcdMsg = fetchLCDText();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SISTec DISPLAY");
  lcd.setCursor(0, 1);
  lcd.print(lcdMsg);
  delay(3000);

  // 5. Send Data to Server (API 1)
  sendSensorData(t, h);
  
  delay(5000); // Wait before next cycle
}

String fetchLCDText() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Required for Render HTTPS without certificate
    HTTPClient http;
    
    String url = serverURL + "/lcd";
    http.begin(client, url);
    int httpCode = http.GET();
    
    if (httpCode > 0) {
      String payload = http.getString();
      http.end();
      return payload;
    }
    http.end();
  }
  return "SERVER ERROR";
}

void sendSensorData(float temp, float hum) {
  if (WiFi.status() == WL_CONNECTED) {
    lcd.clear();
    lcd.print("SENDING DATA TO");
    lcd.setCursor(0, 1);
    lcd.print("WEB SERVER....");
    
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    
    // API 1: /update?t=xxx&h=xxx
    String url = serverURL + "/update?t=" + String(temp) + "&h=" + String(hum);
    
    http.begin(client, url);
    int httpCode = http.GET();
    
    if (httpCode > 0) {
      lcd.clear();
      lcd.print("DATA SENT...!!");
      delay(1000);
    } else {
      Serial.println("Error sending data");
    }
    http.end();
  }
}
