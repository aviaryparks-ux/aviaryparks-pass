const fs = require('fs');
const https = require('https');
const path = require('path');

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const dir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

models.forEach(model => {
  const filePath = path.join(dir, model);
  const file = fs.createWriteStream(filePath);
  https.get(baseUrl + model, function(response) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${model}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {});
    console.error(`Error downloading ${model}: ${err.message}`);
  });
});
