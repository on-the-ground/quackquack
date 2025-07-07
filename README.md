## 🎭 Role-First Object Orientation

This project is named after Alan Kay — not because it’s directly affiliated with him, but because we deeply respect his philosophy of **message passing between objects**.  
Our intention is to carry that spirit forward.

Ironically, however, to truly honor that spirit, we believe we must **break free from the habit of treating everything as an object**.

Objects only gain real value when they **aren’t created arbitrarily**.  
An object deserves to exist only when it can **justify its presence** —  
specifically, when it can **fulfill a Role**.

In this regard, we depart from Alan Kay's assertion that “everything is an object.”  
We say instead: **“Everything begins with a Role.”**  
A Role arises first, born from a concrete need.  
Then, and only then, does an object emerge — as a **candidate** that may fulfill that Role.

**Messages are not sent to objects, but to Roles.**  
An object is simply a responder — an implementer of the behavior required by the Role.

---

## 🧱 Classes Do Not Represent Roles

We often treat classes as mere “bundles of data and methods.”  
But starting with data and then slapping on some methods quickly leads to  
**unprincipled, trash-bin objects**.

Objects are meant to represent **high cohesion**.  
But what defines “right” cohesion has always been ambiguous.  
Now, we propose a clear answer: **the right cohesion comes from the right Role**.

A Role is essentially **a collection of related functions**.  
For example, the role of a `Transaction` might include `play` and `rollback`.  
These functions are grouped not because they share data,  
but because they **share responsibility for the same behavior**.

In this light, cohesion should be driven not by data,  
but by **behavior and responsibility**.

---

## ⏳ Avoid Bring-Up First Design

If you design objects before you clearly understand the roles they need to fulfill,  
you fall into the trap of **Bring-Up First Design** —  
an accidental architecture shaped by momentum rather than intention.

The most valuable objects and roles  
only become clear **when you wait for genuine needs to emerge**.  
The longer you delay their introduction,  
the sharper and more robust they become.

---

## 🔍 Class vs Role

|Concept|Role|Class|
|---|---|---|
|Declared by|The side that **needs** the behavior|The side that **produces** the object|
|Purpose|Specify **behavioral expectations**|Describe **internal structure**|
|Focus|“Can you handle this message?”|“What are you made of?”|
|Prerequisite|Must satisfy external demand|Reflects internal design|

While classes describe objects from the inside out,  
**Roles describe them from the outside in** — from the perspective of **what the world needs**.

---

## 🧠 Real OOP Is About Behavior, Not Reflection

Real object-oriented programming doesn't ask:

> “What are you made of?”

That's reflection — and it has no place in message-driven design.

Instead, real OOP asks:

> “I need someone who can play this role. Can you handle it?”

Everything should be designed around **behavior and responsibility**,  
not around static structure.
