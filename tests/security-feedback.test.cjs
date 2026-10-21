const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('api/send-feedback.js', 'utf8').replace('export default async function', 'async function');
async function request(body, reply, headers = {'content-type':'application/json'}) {
  let calls=0;
  const ctx=vm.createContext({process:{env:{TELEGRAM_BOT_TOKEN:'test-secret',TELEGRAM_CHAT_ID:'test-chat'}},AbortSignal,console:{error(){}},fetch:async()=>{ calls++; if(reply instanceof Error) throw reply; return {json:async()=>reply||{ok:true}}; }});
  vm.runInContext(source,ctx);
  const res={code:0,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
  await ctx.handler({method:'POST',body,headers},res);
  return {res,calls};
}

test('feedback rejects malformed or oversized input before contacting Telegram',async()=>{
  for (const body of [[],{message:{value:'text'}},{message:'   '},{message:'x'.repeat(2001)},{message:'text',email:123}]) {
    const {res,calls}=await request(body);
    assert.equal(res.code,400);
    assert.equal(calls,0);
  }
});
test('feedback requires JSON and accepts bounded feedback',async()=>{
  assert.equal((await request({message:'hello'},undefined,{'content-type':'text/plain'})).res.code,415);
  const {res,calls}=await request({message:'hello',name:'Test'});
  assert.equal(res.code,200);assert.equal(calls,1);
});
test('feedback never exposes upstream descriptions or errors that may contain secrets',async()=>{
  for(const reply of [{ok:false,description:'test-secret in URL'},new Error('https://api.telegram.org/bottest-secret/sendMessage')]){
    const {res}=await request({message:'hello'},reply);
    assert.equal(res.code,502);
    assert.ok(!JSON.stringify(res.body).includes('test-secret'));
  }
});
