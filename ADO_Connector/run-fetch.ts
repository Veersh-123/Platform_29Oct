import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getFullStoryDetails } from './story-connector';

getFullStoryDetails()
  .then((result) => {
    console.log('\n✅ Work Item Retrieved:\n');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error('\n❌ Failed:', err.message);
  });
