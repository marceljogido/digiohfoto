const ftp = require("basic-ftp");
const { getFtpConfig } = require("./utils");

async function testGifFolder() {
  const client = new ftp.Client();
  
  try {
    console.log("🔌 Testing FTP connection for GIF folder...");
    const config = getFtpConfig();
    
    await client.access(config);
    console.log("✅ FTP connection successful!");
    
    // Test creating gif directory (not gifs)
    console.log("📁 Creating gif directory...");
    await client.ensureDir("/gif");
    console.log("✅ gif directory created/verified!");
    
    // List current directory to see structure
    console.log("📂 Listing root directory:");
    const list = await client.list();
    list.forEach(item => {
      console.log(`  ${item.isDirectory ? '📁' : '📄'} ${item.name}`);
    });
    
    // Test listing gif directory
    console.log("📂 Listing gif directory:");
    const gifList = await client.list("/gif");
    if (gifList.length === 0) {
      console.log("  (empty)");
    } else {
      gifList.forEach(item => {
        console.log(`  ${item.isDirectory ? '📁' : '📄'} ${item.name}`);
      });
    }
    
  } catch (error) {
    console.error("❌ FTP Error:", error.message);
  } finally {
    client.close();
  }
}

testGifFolder();
