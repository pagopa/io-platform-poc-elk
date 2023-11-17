# Instagram-Scraper

### Running the application

Create an `.env` file in the root directory and then run:

```
npm install
npm run build
npm start
```

### Environmental Variables

| Environmental Variables | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| INSTAGRAM_URL           | URL to instagram's login page -> https://www.instagram.com |
| INSTAGRAM_USERNAME      | Username of account to be scraped.                         |
| INSTAGRAM_PASSWORD      | Password of account to be scraped                          |

### Output

For simplicity, outputs are logged to the console.

```
[{
    username: 'Chochoitoi',
    imageUrl: 'https://instagram.flos8-1.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/131539145_3374760192649420_8969162707315509784_n.jpg?_nc_ht=instagram.flos8-1.fna.fbcdn.net&_nc_cat=104&_nc_ohc=OxsR91_MkAX8naJrO&tp=1&oh=379bde5d4e72c4437930008af0ca641a&oe=6008AF36',
    caption: 'On Dec 16, we <a class="notranslate" href="/lorem.co/" tabindex="0">@feminist.co</a> distributed bags of food to 1000 low-income women and their families',
    likes: 196
  },
  {
    username: 'Lorem',
    imageUrl: 'https://instagram.flos8-1.fna.fbcdn.net/v/t51.2885-15/e35/13aga1454082_27988739768241_8235082857752983656_n.jpg?_nc_ht=instagram.flos8-1.fna.fbcdn.net&_nc_cat=109&_nc_ohc=zC98Z1BRdbkAX9p1qpG&tp=1&oh=0db7b244ad5b8bd82f7f901e1470e584&oe=6007CA0F',
    caption: 'Literally.. we move',
    likes: 228
  }]
```

### Stack

- [puppeteer](https://pptr.dev/#?product=Puppeteer&version=v5.5.0&show=outline)
- [typescript](https://www.typescriptlang.org/)
- [nodejs](https://nodejs.org/en/docs/)
