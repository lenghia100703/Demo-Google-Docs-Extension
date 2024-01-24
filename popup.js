document.addEventListener('DOMContentLoaded', function () {
    const authorizeButton = document.getElementById('authorize_button');
    const signoutButton = document.getElementById('signout_button');
    const getTextButton = document.getElementById('get_text_button')
    const startIndexEl = document.getElementById('startIndex')
    const endIndexEl = document.getElementById('endIndex')
    const deleteButton = document.getElementById('delete_button')
    const insertButton = document.getElementById('insert_button')
    const textInput = document.getElementById('textInput')
    const replaceButton = document.getElementById('replace_button')
    const accountInfo = document.getElementById('account')

    let startIndex, endIndex, url

    startIndexEl.onchange = function () {
        startIndex = startIndexEl.value
    }

    endIndexEl.onchange = function () {
        endIndex = endIndexEl.value
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        url = tabs[0].url;
        console.log(url)
    });

    authorizeButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            console.log('Login successful')
            chrome.identity.getProfileUserInfo((profile) => {
                accountInfo.innerText = profile.email
                chrome.storage.local.set({ 'userEmail': profile.email });
            });
        });
    }

    chrome.storage.local.get(['userEmail'], function (result) {
        if (result.userEmail) {
            accountInfo.innerText = result.userEmail;
        }
    });

    getTextButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            makeApiCall(token)
        });
    }

    deleteButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            deleteText(token, startIndex, endIndex)
        });
    }

    insertButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            insertText(token, startIndex, textInput.value)
        });
    }

    replaceButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            deleteText(token, startIndex, endIndex)
            insertText(token, startIndex, textInput.value)
        });
    }


    signoutButton.onclick = function () {
        chrome.identity.getAuthToken({interactive: true}, function (token) {
            revokeToken(token, function () {
                removeAllTokens();
                console.log('Sign Out successful');
                accountInfo.innerText = '';
                chrome.storage.local.remove(['userEmail']);
            })
        });
    }

    function revokeToken(token, callback) {
        fetch('https://accounts.google.com/o/oauth2/revoke?token=' + token,)
            .then(response => response.json())
            .catch(error => console.error(error));
        callback();
    }

    function removeAllTokens() {
        chrome.identity.getAuthToken({interactive: false}, function (token) {
            chrome.identity.removeCachedAuthToken({token: token}, function () {
                console.log('Token removed');
            });

        });
    }

    function makeApiCall(token) {
        const documentId = url.split("/")[5]
        fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json',
            },
        })
            .then(response => response.json())
            .then(data => {
                console.log('API Response:', data);
            })
            .catch(error => console.error('API Error:', error));
    }

    function deleteText(token, startIndex, endIndex) {
        const documentId = url.split("/")[5]
        const apiUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const requestBody = {
            requests: [
                {
                    deleteContentRange: {
                        range: {
                            startIndex: startIndex,
                            endIndex: endIndex,
                        },
                    },
                },
            ],
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Text deleted successfully:', data);
            })
            .catch(error => {
                console.error('Error deleting text:', error);
            });
    }

    function insertText(token, startIndex, text) {
        const documentId = url.split("/")[5]
        const apiUrl = `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const requestBody = {
            requests: [
                {
                    insertText: {
                        location: {
                            index: startIndex
                        },
                        text: text
                    },
                },
            ],
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Text insert successfully:', data);
            })
            .catch(error => {
                console.error('Error insert text:', error);
            });
    }

})
