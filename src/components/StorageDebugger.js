import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const StorageDebugger = () => {
  const [buckets, setBuckets] = useState([]);
  const [testResult, setTestResult] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const listBuckets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        setTestResult(`⚠️ ListBuckets API error: ${error.message}\n(Dit is normaal - anon key heeft vaak geen list permissies)`);
        console.error('Error:', error);
      } else {
        setBuckets(data || []);
        setTestResult(`Found ${data?.length || 0} buckets`);
        console.log('Buckets:', data);
      }
    } catch (err) {
      setTestResult(`Exception: ${err.message}`);
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  const testDirectAccess = async () => {
    setLoading(true);
    setUploadedUrl('');
    try {
      // Test 1: Probeer files te listen in bucket
      console.log('Test 1: Listing files in ideas bucket...');
      const { data: files, error: listError } = await supabase.storage
        .from('ideas')
        .list('test', { limit: 1 });

      if (listError) {
        setTestResult(`❌ Bucket 'ideas' bestaat niet of heeft geen read access: ${listError.message}`);
        console.error('List error:', listError);
        setLoading(false);
        return;
      }

      // Test 2: Upload een test bestand
      console.log('Test 2: Uploading test file...');
      const testBlob = new Blob(['test content from debugger'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt');
      const filePath = `test/debug_${Date.now()}.txt`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('ideas')
        .upload(filePath, testFile, { upsert: true });

      if (uploadError) {
        setTestResult(`❌ Upload failed: ${uploadError.message}`);
        console.error('Upload error:', uploadError);
        setLoading(false);
        return;
      }

      // Test 3: Get public URL
      console.log('Test 3: Getting public URL...');
      const { data: { publicUrl } } = supabase.storage
        .from('ideas')
        .getPublicUrl(filePath);

      setUploadedUrl(publicUrl);
      setTestResult(`✅ SUCCESS! Bucket 'ideas' werkt perfect!\n\nUpload path: ${uploadData.path}\nPublic URL: ${publicUrl}`);
      console.log('Upload success:', uploadData);
      console.log('Public URL:', publicUrl);

    } catch (err) {
      setTestResult(`❌ Exception: ${err.message}`);
      console.error('Exception:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gradient-card rounded-xl p-6 max-w-2xl mx-auto mt-8">
      <h2 className="text-white text-2xl font-bold mb-4">Storage Debugger</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
          <h3 className="text-blue-300 font-semibold mb-2">🎯 Belangrijkste Test:</h3>
          <p className="text-white/70 text-sm mb-3">
            Test direct of de 'ideas' bucket werkt (list, upload, en public URL)
          </p>
          <button
            onClick={testDirectAccess}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 w-full"
          >
            {loading ? 'Testing...' : '✨ Test "ideas" Bucket (Direct Access)'}
          </button>
        </div>

        <div className="bg-white/5 rounded-lg p-4">
          <h3 className="text-white/70 font-semibold mb-2">📋 Alternative Test (kan falen):</h3>
          <p className="text-white/50 text-xs mb-2">List Buckets API vereist vaak extra permissions</p>
          <button
            onClick={listBuckets}
            disabled={loading}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 w-full"
          >
            {loading ? 'Loading...' : 'List All Buckets (Advanced)'}
          </button>
        </div>

        {buckets.length > 0 && (
          <div className="bg-white/10 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-2">Available Buckets:</h3>
            <ul className="space-y-1">
              {buckets.map((bucket) => (
                <li key={bucket.id} className="text-white/80 text-sm font-mono">
                  • {bucket.name} (ID: {bucket.id}, Public: {bucket.public ? 'Yes' : 'No'})
                </li>
              ))}
            </ul>
          </div>
        )}

        {testResult && (
          <div className={`rounded-lg p-4 ${testResult.includes('❌') || testResult.includes('Error') ? 'bg-red-500/20 text-red-300 border border-red-500/30' : testResult.includes('✅') ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'}`}>
            <pre className="font-mono text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}

        {uploadedUrl && (
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
            <h3 className="text-green-300 font-semibold mb-2">📸 Test Upload:</h3>
            <a 
              href={uploadedUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm font-mono break-all underline"
            >
              {uploadedUrl}
            </a>
          </div>
        )}

        <div className="bg-white/5 rounded-lg p-4 mt-6">
          <h3 className="text-white/70 text-sm font-semibold mb-2">Debug Info:</h3>
          <p className="text-white/50 text-xs font-mono">Supabase URL: {process.env.REACT_APP_SUPABASE_URL || 'NOT SET'}</p>
          <p className="text-white/50 text-xs font-mono">Anon Key: {process.env.REACT_APP_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}</p>
        </div>
      </div>
    </div>
  );
};

export default StorageDebugger;
