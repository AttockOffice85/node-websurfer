export const formatDate = (date: Date): string => {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const dayOfWeek = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const formattedHours = String(hours).padStart(2, "0");

  return `${dayOfWeek}-${month}-${year} ${formattedHours}:${minutes} ${ampm}`;
};
