import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions
} from "@azure/storage-blob";

const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
const containerName = process.env.AZURE_STORAGE_CONTAINER;
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);

const BASE_URL = `https://${account}.blob.core.windows.net/${containerName}`;


// ✅ GENERATE UPLOAD SAS (WRITE)
export const generateUploadSAS = async (blobName, fileType) => {
  const expiresOn = new Date(Date.now() + 5 * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("cw"),
      expiresOn,
      contentType: fileType
    },
    sharedKeyCredential
  ).toString();

  return {
    uploadUrl: `${BASE_URL}/${blobName}?${sasToken}`,
    blobName
  };
};


// ✅ GENERATE READ SAS (SECURE VIEW)
export const generateReadSAS = (blobName) => {
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn
    },
    sharedKeyCredential
  ).toString();

  return `${BASE_URL}/${blobName}?${sasToken}`;
};


// ✅ DELETE
export const deleteFromAzure = async (blobName) => {
    try{
        if (!blobName) return;

        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        const exists = await blockBlobClient.exists();
        if(!exists){
            console.warn("Blob not found:", blobName);
            return;
        }
        await blockBlobClient.delete();
        console.log("Deleted blob:", blobName);
        return {success:true}
    }catch(err){
        console.error("Delete error:", err);
        return {success:false};
    }

};

