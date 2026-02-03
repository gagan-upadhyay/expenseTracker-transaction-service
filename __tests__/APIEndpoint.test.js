import request from 'supertest';
import app from '../index.js';

describe('GET /', ()=>{
    // No need to start the server; supertest will use the express app directly.

    it('Should return 200 with Welcome message', async()=>{
        const res = await request(app)
        .get('/');
        expect(res.statusCode).toBe(200);
        expect(res.body).toStrictEqual({message:"Welcome to the transaction-service"});
    });
});