import { Payload } from "payload"

interface paidUserInterface {
  collection: "users" | "customers" | undefined
  userID: string | undefined
  payload: Payload
  id: string
}

export async function paidUser({collection, userID, payload, id}: paidUserInterface){
  if(collection === "users"){
    return true;
  } else {
    const participations = await payload.find({
      collection: "participation",
      where: {
        customer: {equals: userID},
        course: {equals: id},
        paid: {equals: true}
      }
    })

    return participations.docs.length > 0
  }
}