exports.handler = async (event) => {
  const min = event?.min ?? 0;
  const max = event?.max ?? 999999;

  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  const formatted = randomNumber.toString().padStart(6, "0");

  return {
    statusCode: 200,
    body: {
      random: randomNumber,
      formatted,
    },
  };
};
