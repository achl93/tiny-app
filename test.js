function generateRandomString() {
  let random = (Math.random()*2).toString(36);
  return random.slice(2, 8);
}

console.log(generateRandomString());