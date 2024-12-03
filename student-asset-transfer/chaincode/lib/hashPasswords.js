const bcrypt = require('bcryptjs');
const fs = require('fs').promises; // Use promises for consistency with async/await

async function hashPasswords() {
    const data = require('./initLedgerTemplate.json');

    // Hash doctor passwords
    for (const doctor of data.doctors) {
        doctor.password = await bcrypt.hash(doctor.password, 10);
    }

    // Hash patient passwords
    for (const patient of data.patients) {
        patient.password = await bcrypt.hash(patient.password, 10);
    }

    // Hash pharmacy passwords
    for (const pharmacy of data.pharmacies) {
        pharmacy.password = await bcrypt.hash(pharmacy.password, 10);
    }

    // Hash admin passwords (since data.admin is an array)
    for (const admin of data.admin) {
        admin.password = await bcrypt.hash(admin.password, 10);
    }

    await fs.writeFile('initLedger.json', JSON.stringify(data, null, 2));
}

hashPasswords().catch((error) => {
    console.error('Error hashing passwords:', error);
});
