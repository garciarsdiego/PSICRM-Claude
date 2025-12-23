
const url = 'https://ntdwvbkiqqcvruuqcynb.supabase.co/functions/v1/google-calendar-auth';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50ZHd2YmtpcXFjdnJ1dXFjeW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTI1OTYsImV4cCI6MjA4MjA2ODU5Nn0.AXqqPGZ7LKrfzRNT3-qwciUqwpQvd3WOHcI3AiXOdfE';

async function testFunction() {
    console.log('Testing google-calendar-auth function...');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'get_auth_url',
                redirect_uri: 'http://localhost:8080/schedule'
            })
        });

        console.log('Status:', response.status);
        const text = await response.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testFunction();
