function fn() {
  var config = {
    baseUrl: karate.properties['baseUrl'] || 'https://demoqa.com',
    password: 'Passw0rd!123'
  };
  karate.configure('connectTimeout', 10000);
  karate.configure('readTimeout', 15000);
  return config;
}
