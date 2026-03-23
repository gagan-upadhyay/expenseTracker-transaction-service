export default async function () {
  await new Promise((r) => setTimeout(r, 100)); // allow open handles to close
}