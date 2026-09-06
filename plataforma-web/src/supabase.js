import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hnacrhtixdkufqpmcfdq.supabase.co';
const supabaseKey = 'sb_publishable_QI9PxaWB2dUCrSL4paIyAA_OgD7t1jt';

export const supabase = createClient(supabaseUrl, supabaseKey);