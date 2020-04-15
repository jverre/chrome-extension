// function interceptData() {
//     var xhrOverrideScript = document.createElement('script');
//     xhrOverrideScript.type = 'text/javascript';
//     xhrOverrideScript.innerHTML = `
//     (function() {
//       console.log('test')
//       var XHR = XMLHttpRequest.prototype;
//       var send = XHR.send;
//       var open = XHR.open;
//       XHR.open = function(method, url) {
//           this.url = url; // the request url
//           console.log('url = ', this.url)
//           return open.apply(this, arguments);
//       }
//       XHR.send = function() {
//           this.addEventListener('load', function() {
//               console.log('Running script')
//               if (this.url.includes('<url-you-want-to-intercept>')) {
//                   var dataDOMElement = document.createElement('div');
//                   dataDOMElement.id = '__interceptedData';
//                   dataDOMElement.innerText = this.response;
//                   dataDOMElement.style.height = 0;
//                   dataDOMElement.style.overflow = 'hidden';
//                   document.body.appendChild(dataDOMElement);
//               }               
//           });
//           return send.apply(this, arguments);
//       };
//     })();
//     `
//     document.head.prepend(xhrOverrideScript);
// }
// function checkForDOM() {
//     if (document.body && document.head) {
//         interceptData();
//     } else {
//         requestIdleCallback(checkForDOM);
//     }
// }
// requestIdleCallback(checkForDOM);

// function scrapeData() {
//     var responseContainingEle = document.getElementById('__interceptedData');
//     if (responseContainingEle) {
//         console.log('test', responseContainingEle.innerHTML);
//         //var response = JSON.parse(responseContainingEle.innerHTML);
//     } else {
//         requestIdleCallback(scrapeData);
//     }
// }
// requestIdleCallback(scrapeData); 

(function(xhr) {
    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;
    var setRequestHeader = XHR.setRequestHeader;

    XHR.open = function(method, url) {
        this._method = method;
        this._url = url;
        this._requestHeaders = {};
        this._startTime = (new Date()).toISOString();
        
        return open.apply(this, arguments);
    };
    
    XHR.setRequestHeader = function(header, value) {
        this._requestHeaders[header] = value;
        return setRequestHeader.apply(this, arguments);
    };
    
    XHR.send = function(postData) {

        this.addEventListener('load', function() {
            var endTime = (new Date()).toISOString();
            
            var myUrl = this._url ? this._url.toLowerCase() : this._url;
            
            if(myUrl.includes('/sales-api/salesapipeoplesearch') || myUrl.includes('/sales-api/salesapicompanies')) {
                if (postData) {
                    if (typeof postData === 'string') {
                        try {
                            // here you get the REQUEST HEADERS, in JSON format, so you can also use JSON.parse
                            this._requestHeaders = postData;    
                        } catch(err) {
                            console.log('Request Header JSON decode failed, transfer_encoding field could be base64');
                            console.log(err);
                        }
                    } else if (typeof postData === 'object' || typeof postData === 'array' || typeof postData === 'number' || typeof postData === 'boolean') {
                            // do something if you need
                    }
                }
                
                // Format user data
                if (myUrl.includes('/sales-api/salesapipeoplesearch') && this.responseType == 'blob') {
                    this.response.text().then( (data) => {
                        try {
                            document.getElementById("api_caching_extension").outerHTML = "";    
                        } catch (error) {
                            
                        }
                        
                        var elem = document.createElement('code');
                        elem.id = 'api_caching_extension';
                        elem.textContent = data;
                        elem.style.cssText = 'display:none;';
                        document.body.insertBefore(elem, document.getElementsByTagName('code')[0]);
                    })
                } else if (myUrl.includes('/sales-api/salesapicompanies')) {
                    var arr = JSON.parse(this.responseText);
                    var name = arr.name;
                    var description = arr.description;
                    var industry = arr.industry;
                    var website = arr.website;
                    var company_id = arr.entityUrn.split(":").slice(-1)[0];
                    
                    document.dispatchEvent(new CustomEvent("extension:company:add", {
                        "detail": {
                            type: "extension:company:add",
                            company: {
                                name,
                                description,
                                industry,
                                website,
                                company_id
                            }
                        }
                    }))
                }
            }
        });

        return send.apply(this, arguments);
    };

})(XMLHttpRequest);