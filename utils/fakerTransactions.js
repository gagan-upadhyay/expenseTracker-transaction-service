import { faker } from "@faker-js/faker";
const categories =  ['Food', 'Rent', 'Travel', 'Shopping', 'Utilities'];
const merchants = ['Zomato', 'Amazon', 'Uber', 'Flipkart', 'Swiggy'];

export default function generateFakeTransactions(accountId){
    return {
        account_id:accountId,
        category:faker.helpers.arrayElement(categories),
        amount:parseFloat(faker.finance.amount(-1000, -50, 2)),
        timestamp:faker.date.recent(30),
        merchant:faker.helpers.arrayElement(merchants)
    }
}