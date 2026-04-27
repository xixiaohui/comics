import tcb from '@cloudbase/node-sdk'


const huanyuan = tcb.init({ 
  env: process.env.CLOUDBASE_ENV_ID , 
  secretId: process.env.CLOUDBASE_SECRET_ID, 
  secretKey: process.env.CLOUDBASE_SECRET_KEY,
  timeout: 60000,
  region: 'ap-shanghai'
})

export const db = huanyuan.database();

export const hunyuan_ai = huanyuan.ai();