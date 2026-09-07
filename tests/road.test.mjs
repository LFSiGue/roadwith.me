import test from 'node:test';
import assert from 'node:assert/strict';
import {matches,canSeeEmergency,validateTrip,cleanPhone} from '../lib/road.ts';
const now=1800000000000;
const trip={id:'a',nickname:'A',corridor:'mex-qro',origin:0,destination:3,departure:now-1000,endsAt:now+3600000,status:'active',support:true,emergency:false,reason:'',location:''};
test('matches a shared segment in the same direction and time window',()=>assert.equal(matches(trip,{...trip,origin:1,destination:2}),true));
test('does not match opposite traffic, separate corridors or a shared endpoint only',()=>{
 for(const other of [{...trip,origin:3,destination:0},{...trip,corridor:'pue-ver'},{...trip,origin:2,destination:3}])assert.equal(matches({...trip,destination:2},other),false);
});
test('does not match non-overlapping travel windows',()=>assert.equal(matches(trip,{...trip,departure:trip.endsAt,endsAt:trip.endsAt+1000}),false));
test('emergency contacts are eligible only during a matching active emergency',()=>{
 const target={...trip,id:'b',emergency:true};
 assert.equal(canSeeEmergency(trip,target,now),true);
 for(const viewer of [{...trip,status:'planned'},{...trip,status:'complete'},{...trip,endsAt:now},{...trip,departure:now+100},{...trip,origin:3,destination:0},{...trip,corridor:'pue-ver'}])assert.equal(canSeeEmergency(viewer,target,now),false);
});
test('resolving, completing or expiry immediately removes emergency eligibility',()=>{
 for(const target of [{...trip,emergency:false},{...trip,emergency:true,status:'complete'},{...trip,emergency:true,status:'planned'},{...trip,emergency:true,endsAt:now},{...trip,emergency:true,departure:now+1}])assert.equal(canSeeEmergency(trip,target,now),false);
});
test('trip validation rejects invalid stops, routes and dates',()=>{
 const input={corridor:'mex-qro',origin:0,destination:3,departure:now};
 for(const patch of [{destination:0},{origin:-1},{destination:4},{origin:0.5},{corridor:'unknown'},{departure:NaN},{departure:now-301000},{departure:now+8*86400000}])assert.throws(()=>validateTrip({...input,...patch},now));
 assert.equal(validateTrip(input,now).endsAt,now+6*3600000);
 assert.equal(validateTrip({...input,origin:3,destination:0},now).origin,3);
});
test('phones normalize formatting and reject non-telephone content',()=>{
 assert.equal(cleanPhone('+52 (999) 000-0000'),'+529990000000');
 assert.equal(cleanPhone(''), '');
 for(const value of ['tel:911','<script>','123','1234567890123456'])assert.throws(()=>cleanPhone(value,true));
 assert.throws(()=>cleanPhone('',true));
});
