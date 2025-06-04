import gsap from "gsap";

var isBack = false;
function decryptText(element, delay = 0, isNav = false)
{
    const chars = "⡷⣸⠿⣾⢿⣯⣻⠟⠻⡿▚▞▙▛▜▟●◆◇◈✶✸✦✧⟁⧫⬢⬣◍◎◉";
    const targetText = isNav
        ? element.getAttribute("data-text") || element.textContent
        : element.getAttribute("data-text");

    const iterations = 10;
    let frame = 0;

    const scramble = setInterval(() =>
    {
        let output = "";

        for (let i = 0; i < targetText.length; i++)
        {
            if (i < frame)
            {
                output += targetText[i];
            }
            else
            {
                output += chars[Math.floor(Math.random() * chars.length)];
            }
        }

        element.textContent = output;
        frame++;

        if (frame > targetText.length + iterations)
        {
            clearInterval(scramble);
            element.textContent = targetText;
        }
    }, 20 + delay);
}

function nameToId(name)
{
    return `node-${name}`;
}

function idToName(id)
{
    return id.replace(/^node-/, "");
}

function getRandomInt(min, max) 
{
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

var skipTitleAnimation = false
var skipChildAnimation = false
setInterval(() =>
{
    if (Math.random() < 0.5)
    {
        if (!skipTitleAnimation) 
        {
            decryptText(document.getElementById("Title"), 30, false);
        }
        else
        {
            skipTitleAnimation = false;
        }
    }
    else
    {
        decryptText(document.getElementById("Intro"), 30, false); 
    }

}, 3000);


var ChildList = []
setInterval(() =>
{
    if (Math.random() < 0.8)
    {
        decryptText(document.getElementById("GoTanpi"), 30, false); 

        if(ChildList.length>0)
        {
            
            if(!skipChildAnimation)
            {
                let i = getRandomInt(0, ChildList.length-1)
                decryptText(ChildList[i], 30, false);
            }
            else
            {
                skipChildAnimation = false;
            }
        }
    }

}, 2500);

const isMobile = /Mobi|Android/i.test(navigator.userAgent);
if (isMobile)
{
    document.getElementById("tellControls").innerHTML = "Cannot be Played on Mobile"
}
else
{
    document.getElementById("tellControls").innerHTML = "use Arrow keys to control Sysra"
}


const PageContent = document.getElementById("PageContainer");
function displayNode(nodeId)
{
    if(nodeId == "node-play")
    {
        window.sharedData.isGameOpen = true;
        clearDisplayNode();
        const path = getCurrentPathIds();
        if (path[path.length - 1] !== nodeId)
        {
            path.push(nodeId);
        }
        skipTitleAnimation = true;
        skipChildAnimation = true;
        updateHashFromIds(path);
        
        document.getElementById("instruction").style.visibility = 'visible'
        const existingImageData = document.querySelector("#PageContainer image-data");
        const existingVidoeData = document.querySelector("#PageContainer video-data");

        if (existingImageData) existingImageData.remove();
        if (existingVidoeData) existingVidoeData.remove();
        return;
    }
    else
    {
        document.getElementById("instruction").style.visibility = 'hidden';

        window.sharedData.isGameOpen = false;
    }
    const node = document.getElementById(nodeId);
    if (!node) return;

    const titleText = node.querySelector(".node-name")?.textContent || "Untitled";
    const content = node.querySelector(".node-content")?.innerHTML || "";

    const titleElement = document.getElementById("Title");
    const contentElement = document.getElementById("Content");

    const imageData = node.querySelector("image-data");
    const videoData = node.querySelector("video-data");

    const existingImageData = document.querySelector("#PageContainer image-data");
    const existingVidoeData = document.querySelector("#PageContainer video-data");

    if (existingImageData) existingImageData.remove();
    if (existingVidoeData) existingVidoeData.remove();

    if (imageData)
    {
        const clonedImageData = imageData.cloneNode(true);
        PageContent.appendChild(clonedImageData);
    }
    if (videoData)
    {
        const clonedVideoeData = videoData.cloneNode(true);
        PageContent.appendChild(clonedVideoeData);
    }

    const oldLinks = contentElement.querySelectorAll(".child-link");
    oldLinks.forEach(link => {
        const newLink = link.cloneNode(true); // deep = true by default
        link.replaceWith(newLink);
    });

    gsap.to([titleElement, contentElement], {
        duration: 0.4,
        opacity: 0,
        y: isBack?10:-10,
        onComplete: () =>
        {
            titleElement.textContent = titleText;
            titleElement.setAttribute("data-text", titleText);
            contentElement.innerHTML = content;

            const childLinks = contentElement.querySelectorAll(".child-link");
            ChildList = childLinks;
            childLinks.forEach(link =>
            {
                const text = link.textContent;
                link.setAttribute("data-text", text);
                decryptText(link, 30);
            });

            attachChildLinkListeners();

            gsap.fromTo([titleElement, contentElement],
                { opacity: 0, y: isBack?-10:10},
                {
                    duration: 0.4,
                    opacity: 1,
                    y: 0,
                    ease: "power2.out",
                    onStart: () =>
                    {
                        isBack = false;
                        decryptText(titleElement, 30);
                    }

                }
            );
        }
    });

    const path = getCurrentPathIds();
    if (path[path.length - 1] !== nodeId)
    {
        path.push(nodeId);
    }
    skipTitleAnimation = true;
    skipChildAnimation = true;
    updateHashFromIds(path);


}

function clearDisplayNode() 
{
    const titleElement = document.getElementById("Title");
    titleElement.setAttribute("data-text", '');
    const contentElement = document.getElementById("Content");

    titleElement.textContent = "";
    contentElement.innerHTML = "";

}


function getCurrentPathIds()
{
    const hashParts = location.hash.slice(1).split("#").filter(Boolean);
    return hashParts.map(name => nameToId(name));
}

function updateHashFromIds(pathIds)
{
    const pathNames = pathIds.map(id => idToName(id));
    location.hash = "#" + pathNames.join("#");
}

function handleHashChange()
{
    const pathIds = getCurrentPathIds();
    
    if(pathIds.length == 0)
    {
        document.getElementById("Intro").style.display = ''; 
        document.getElementById("GoTanpi").style.display = ''; 
        clearDisplayNode();
    } 
    else
    {
        // document.getElementById("Intro").style.display = 'none'; 
        // document.getElementById("GoTanpi").style.display = 'none';  
    }
    const targetNodeId = pathIds[pathIds.length - 1];
    if (targetNodeId)
    {
        displayNode(targetNodeId);
    }
}
window.sharedData = {
    isGameOpen: false,
    imageHover: null
};


let hoverTimeoutStack = [];

function attachChildLinkListeners()
{
    document.querySelectorAll("#Content .child-link").forEach(link =>
    {
        const targetId = link.dataset.target;

        const clearAllHoverTimeouts = () =>
        {
            hoverTimeoutStack.forEach(timeoutID => clearTimeout(timeoutID));
            window.sharedData.imageHover = null;
            hoverTimeoutStack = [];
        };

        if (link.dataset.link == null)
        {
            link.onclick = () =>
            {
                // console.log(hoverTimeoutStack);
                clearAllHoverTimeouts();
                displayNode(targetId);
            };
        }
        else
        {
            link.onclick = () =>
            {
                clearAllHoverTimeouts();
                window.open(link.dataset.link, '_blank');
            };
        }

        link.onmouseenter = () =>
        {
            
            const timeoutID = setTimeout(() =>
            {
                window.sharedData.imageHover = targetId;
            }, 500);

            hoverTimeoutStack.push(timeoutID);
        };

        link.onmouseleave = () =>
        {
            const timeoutID = setTimeout(() =>
            {
                window.sharedData.imageHover = null;
            }, 500);

            hoverTimeoutStack.push(timeoutID);
        };
    });
}





let introVisible = false;
let animationPlaying = false;

function animate()
{
    requestAnimationFrame(animate);

    const pathIds = getCurrentPathIds();
    const introDiv = document.getElementById("Intro");
    const goTanpiDiv = document.getElementById("GoTanpi");


    if (pathIds.length === 0)
    {
        document.getElementById("Backbutton").style.display = 'none'
        if (!introVisible && !animationPlaying)
        {
            animationPlaying = true;

            introDiv.style.display = '';
            goTanpiDiv.style.display = '';

            // Slide from top and fade in
            gsap.fromTo(introDiv,
                { opacity: 0, y: 100 },
                { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1)", delay: 0.2 ,
                  onComplete: () => {
                      animationPlaying = false;
                      introVisible = true;
                  }
                }
            );

            gsap.fromTo(goTanpiDiv,
                { opacity: 0, y: 100 },
                { opacity: 1, y: 0, duration: 0.6, ease: "back.out(1)", delay: 0.2 }
            );

        }
        clearDisplayNode();
    }
    else
    {
        if(pathIds[pathIds.length-1] == "#play") clearDisplayNode();
        document.getElementById("Backbutton").style.display = ''

        if (introVisible && !animationPlaying)
        {
            animationPlaying = true;

            // Slide down and fade out
            gsap.to(introDiv, {
                opacity: 0,
                y: 100,
                duration: 0.5,
                ease: "power1.in",
                onComplete: () => {
                    introDiv.style.display = 'none';
                    animationPlaying = false;
                    introVisible = false;
                }
            });

            gsap.to(goTanpiDiv, {
                opacity: 0,
                y: 100,
                duration: 0.5,
                ease: "power1.in",
                onComplete: () => {
                    goTanpiDiv.style.display = 'none';
                }
            });
        }
    }
}



window.addEventListener("DOMContentLoaded", async () =>
{
    document.getElementById("instruction").style.visibility = 'hidden';
    document.getElementById("Intro").style.display = 'none'; 
    document.getElementById("GoTanpi").style.display = 'none'; 
    handleHashChange();
    BlurButtonHandle();
    await playin();
});


function BlurButtonHandle()
{
    const blurToggle = document.getElementById("blurToggle");
    const pageContainer = document.getElementById("PageContainer");

    if(isMobile)
    {
        const saved = localStorage.getItem("blurEnabled");
        if(saved == null) {blurToggle.checked = false; console.log("sd");}
        else if (saved === "false") blurToggle.checked = false;
        else  blurToggle.checked = true;
        applyBlur(blurToggle.checked);
    }
    else
    {
        blurToggle.checked = false;
        applyBlur(blurToggle.checked);
    }

    

    blurToggle.addEventListener("change", () =>
    {
        const isBlurEnabled = blurToggle.checked;
        applyBlur(isBlurEnabled);
        localStorage.setItem("blurEnabled", isBlurEnabled);
    });

    function applyBlur(enabled)
    {
        if (enabled)
        {
            pageContainer.classList.add("blur-enabled");
        }
        else
        {
            pageContainer.classList.remove("blur-enabled");
        }
    }
}



async function playin() 
{
    window.sharedData.imageHover = null;
    let condition = true;
    while (condition) 
    {
        if(document.getElementById("loadingScreen") == null)
        {
            animate();
            condition = false;
            break;
        }
        await new Promise(r => setTimeout(r, 100)); 
    }    
}

window.addEventListener("hashchange", handleHashChange);


document.getElementById("GoTanpi").addEventListener("click", () =>
{
    const targetId = document.getElementById("GoTanpi").dataset.target;    
    displayNode(targetId);
});

function popLastHash()
{
    const hash = location.hash;
    const parts = hash.split('#').filter(Boolean); // removes empty string from first '#'
    
    parts.pop();
    location.hash = parts.length ? '#' + parts.join('#') : '';
}


document.getElementById("Backbutton").addEventListener("click", () =>
{
    const list = getCurrentPathIds();
    
    if (list.length >= 2)
    {
        isBack = true;
        popLastHash(); 
    }
    else if (list.length == 1)
    {
        isBack = true;
        popLastHash();
    }
});