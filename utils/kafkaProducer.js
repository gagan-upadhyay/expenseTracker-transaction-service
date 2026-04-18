// import { timeStamp } from "console";
// import { producer, TOPICS } from "../config/kafka.js";
// import crypto from 'crypto';


// let isConnected=false;

// export const connectProducer = async()=>{
//     if(!isConnected){
//         await producer.connect();
//         isConnected=true;
//         console.log("✅ Kafka Producer Connected");
//     }
// };

// export const publishEvent = async(eventType, data, key)=>{
//     if (!data || typeof data!=="object") {
//         throw new Error("Invalid Kafka event payload");
//     }
//     if(!key){
//         throw new Error("Kafka key is missing");
//     }
//     try{
//         await connectProducer();
//         const payload = {        
//             eventId:crypto.randomUUID(),
//             eventType,
//             timestamp: new Date().toISOString(),
//             data,
//         };
//         const message={
//             key:String(key),
//             value:JSON.stringify(payload),
//         }
//          console.log("📦 FINAL MESSAGE OBJECT:", message);

//         if(!message||!message.value){
//             throw new Error("Kafka message value is empty");
//         }
//         console.log('Kafka Message:', payload);
//         console.log("📤 Sending Kafka event:", {
//             eventType,
//             data,
//             key
//         });

//         await producer.send({
//             topic:TOPICS.MAIN,
//             messages:[
//                 {
//                     ...message,
//                     headers:{
//                         eventType,
//                         retryCount:"0",
//                     },
//                 },
//             ],
//             acks:-1,
//             timeout:30000,
//         });

       
//     }catch(err){
//         console.error(err);
//         throw new Error('Unbale to produce');
//     }
    
// };
