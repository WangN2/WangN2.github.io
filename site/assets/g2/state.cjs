(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.G2State=api;})(globalThis,()=>{
 const key='wangn2:g2:v1';
 function valid(s){return s&&s.version===2&&s.q&&typeof s.q==='object'&&!Array.isArray(s.q)&&Object.values(s.q).every(Number.isFinite)&&Array.isArray(s.base)&&s.base.length===3&&s.base.every(Number.isFinite)&&['left','right','body','head','gripper_l','gripper_r','base'].includes(s.group)&&['gripper_l_center_link','gripper_r_center_link'].includes(s.tool)&&Number.isInteger(s.selected)&&s.selected>=0&&['down','bent','zero'].includes(s.preset);}
 return {readState(storage){try{const s=JSON.parse(storage.getItem(key));return valid(s)?s:null;}catch{return null;}},
 writeState(storage,s){try{if(!valid(s))return false;storage.setItem(key,JSON.stringify(s));return true;}catch{return false;}}};
});
