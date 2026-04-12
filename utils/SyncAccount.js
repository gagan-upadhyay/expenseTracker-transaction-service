const accountURL = process.env.ACCOUNT_URL;

export default async function SyncAccount(requestType, body){
    if(!body || !requestType){
        return {
            success:false,
            error:`${!body?'Body is Empty':!requestType?'requestType is empty':null}!`
        }
    }
    const {accountId}=body;

    const res = await fetch(`${accountURL}/api/v1/accounts/${accountId}`, {
        method:requestType,
        body:body,
    });



}