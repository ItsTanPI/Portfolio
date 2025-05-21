import gsap from "gsap";

const navLinks = document.querySelectorAll(".nav-link");
let activeSection = null;
let activeLink = null;

setInterval(() =>
{
    if (activeLink)
  {
    if (Math.random() < 0.3)
    {
        decryptText(activeLink, 50, true);
    }
}
}, 3000);

navLinks.forEach(link =>
{
  link.addEventListener("click", e =>
  {
    e.preventDefault();
    setActiveNav(link);
});
});

const decriptText = document.querySelectorAll(".decryptText");
decriptText.forEach(link =>
    {
      link.addEventListener("click", e =>
      {
        e.preventDefault();
        decryptText(link, 10, true);
      });
    });
    
function setActiveNav(link)
{
  navLinks.forEach(l =>
  {
    gsap.to(l, { scale: 1, color: "white", duration: 0.3 });
    l.classList.remove("active");
    l.textContent = l.getAttribute("data-text");
  });

  gsap.to(link, { scale: 1.5, color: "#7f5af0", duration: 0.3 });
  link.classList.add("active");

  decryptText(link, 50, true);

  activeLink = link;
  activeSection = link.getAttribute("href").substring(1);

  document.querySelectorAll(".content-section").forEach(section =>
  {
    if (section.id === activeSection)
    {
      
      gsap.set(section, { display: "block" });
      gsap.fromTo(section,
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" });

    //   section.querySelectorAll(".decryptText").forEach(el =>
    //   {
    //     decryptText(el, 50)
    //   });

    section.querySelectorAll(".decryptText").forEach(el =>
        {
          el.textContent = el.getAttribute("data-text");
        });
    }
    else
    {
      gsap.set(section, { autoAlpha: 0, y: 20, display: "none" });
    }
  });
}

function decryptText(element, delay = 0, isNav = false)
{
  const chars = "!<>-_\\/[]{}—=+*^?#@#%^&*";
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

window.addEventListener("DOMContentLoaded", () =>
{
  const defaultLink = document.querySelector('.nav-link[data-text="About"]');
  if (defaultLink)
  {
    setActiveNav(defaultLink);
  }
});


const entries = document.querySelectorAll(".entry");

entries.forEach(entry =>
{
  const name = entry.querySelector(".entry-name");
  const desc = entry.querySelector(".entry-description");

  name.addEventListener("click", () =>
  {
    const isOpen = desc.dataset.open === "true";

    entries.forEach(other =>
    {
      const otherDesc = other.querySelector(".entry-description");
      otherDesc.dataset.open = "false";
      gsap.to(otherDesc, {
        height: 0,
        opacity: 0,
        duration: 0.4,
        ease: "power2.inOut",
        onComplete: () =>
        {
          otherDesc.style.pointerEvents = "none";
        }
      });
    });


    if (isOpen) return;

    desc.style.pointerEvents = "auto";
    desc.dataset.open = "true";

    desc.style.height = "auto";
    const fullHeight = desc.scrollHeight;

    desc.style.height = "0px";
    gsap.to(desc, {
      height: fullHeight,
      opacity: 1,
      duration: 0.4,
      ease: "power2.inOut"
    });
  });
});