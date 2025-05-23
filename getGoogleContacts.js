export async function fetchContacts(token) {
  const response = await fetch(
    "https://people.googleapis.com/v1/otherContacts?readMask=emailAddresses,names&pageSize=1000",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) throw new Error("Failed to fetch other contacts");

  const data = await response.json();

  return (data.otherContacts || [])
    .map(person => {
      const email = person.emailAddresses?.[0]?.value;
      const name =
        person.names?.[0]?.displayName ||
        (email?.includes("@") ? email.split("@")[0].replace(/[._]/g, " ") : "Unknown");
      return { name, email };
    })
    .filter(c => c.email);
}
