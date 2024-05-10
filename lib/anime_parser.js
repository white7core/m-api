import axios from 'axios';
import cheerio from 'cheerio';
import puppeteer from 'puppeteer';

import {
  generateEncryptAjaxParameters,
  decryptEncryptAjaxResponse,
} from './helpers/extractors/goload.js';
import { extractStreamSB } from './helpers/extractors/streamsb.js';
import { extractFembed } from './helpers/extractors/fembed.js';
import { USER_AGENT, renameKey } from './utils.js';

const BASE_URL = 'https://ww5.gogoanimes.fi';
const BASE_URL2 = 'https://ww5.gogoanimes.fi';
const ajax_url = 'https://ajax.gogocdn.net/';
const anime_info_url = 'https://ww5.gogoanimes.fi/category/';
const anime_movies_path = '/anime-movies.html';
const popular_path = '/popular.html';
const new_season_path = '/new-season.html';
const search_path = '/search.html';
const popular_ongoing_url = `${ajax_url}ajax/page-recent-release-ongoing.html`;
const recent_release_url = `${ajax_url}ajax/page-recent-release.html`;
const list_episodes_url = `${ajax_url}ajax/load-list-episode`;
const seasons_url = 'https://anitaku.so/sub-category/';

const Referer = 'https://gogoplay.io/';
const goload_stream_url = 'https://embtaku.pro/streaming.php';
export const DownloadReferer = 'https://embtaku.pro/';

const disqus_iframe = (episodeId) =>
  `https://disqus.com/embed/comments/?base=default&f=gogoanimetv&t_u=https%3A%2F%2Fgogoanime.vc%2F${episodeId}&s_o=default#version=cfefa856cbcd7efb87102e7242c9a829`;
const disqus_api = (threadId, page) =>
  `https://disqus.com/api/3.0/threads/listPostsThreaded?limit=100&thread=${threadId}&forum=gogoanimetv&order=popular&cursor=${page}:0:0&api_key=E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F`;

const Genres = [
  'action',
  'adventure',
  'cars',
  'comedy',
  'crime',
  'dementia',
  'demons',
  'drama',
  'dub',
  'ecchi',
  'family',
  'fantasy',
  'game',
  'gourmet',
  'harem',
  'hentai',
  'historical',
  'horror',
  'josei',
  'kids',
  'magic',
  'martial-arts',
  'mecha',
  'military',
  'Mmusic',
  'mystery',
  'parody',
  'police',
  'psychological',
  'romance',
  'samurai',
  'school',
  'sci-fi',
  'seinen',
  'shoujo',
  'shoujo-ai',
  'shounen',
  'shounen-ai',
  'slice-of-life',
  'space',
  'sports',
  'super-power',
  'supernatural',
  'suspense',
  'thriller',
  'vampire',
  'yaoi',
  'yuri',
  'isekai',
];

export const scrapeTrendingAnime = async () => {
  try {
    const trending_url = 'https://hianime.to/home'; // Trending anime URL
    const trending_page = await axios.get(trending_url);
    const $ = cheerio.load(trending_page.data);

    const trendingList = [];

    $('.swiper-slide.item-qtip').each((i, el) => {
      trendingList.push({
        animeId: $(el).attr('data-id'),
        animeTitle: $(el).find('.dynamic-name').text(),
        animeImg: $(el).find('.film-poster-img').attr('data-src'),
        animeUrl: $(el).find('.film-poster').attr('href'),
        // Assuming there's no 'latest episode' information available in the provided HTML
      });
    });

    return trendingList;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};


async function info(slug) {
    let genres = []

    try{
        res = await axios.get(`https://hiperdex.com/manga/${slug}`)
        const body = await res.data;
        const $ = cheerio.load(body)

        let manhwa_title = $('.post-title > h1:nth-child(1)').text().trim()
        let poster = $('.summary_image img').attr('src')
        let author = $('.author-content a').text().trim()
        let artist = $('.artist-content a').text().trim()

        let genres_e = $('.genres-content a')

        $(genres_e).each((i,e)=>{
            genres.push($(e).text().trim())
        })

        let other_name = $('div.post-content_item:nth-child(5) > div:nth-child(2)').text().trim()

        let status = $('div.post-content_item:nth-child(2) > div:nth-child(2)').text().trim()

        let description = $('.description-summary').text().trim()

        let ch_list = await chaptersList(`https://hiperdex.com/manga/${slug}/ajax/chapters/`)

         return await ({
            'page': manhwa_title,
            'other_name': other_name,
            'poster': poster,
            'authors': author,
            'artists': artist,
            'genres':genres,
            'status': status,
            'description': description,
            ch_list
        })
     } catch (error) {
            console.log(error);
return await ({'error': 'Sorry dude, an error occured! No Info!'})
     }

}

async function chaptersList(url){
    let ch_list = []

    try{
        res = await axios.post(url)
        const body = await res.data;
        const $ = cheerio.load(body)

        $('.version-chap li').each((index, element) => {

                $elements = $(element)
                title = $elements.find('a').text().trim()
                url = $elements.find('a').attr('href')
                time = $elements.find('.chapter-release-date').find('i').text()
                status = $elements.find('.chapter-release-date').find('a').attr('title')

                chapters = {'ch_title': title, 'time': time, 'status': status, 'url': url}

                ch_list.push(chapters)
        })

        return await (ch_list)
    } catch(error) {
            console.log(error);
return await ('Error Getting Chapters!')
    }
}
export { info };


async function scrapeMangaItems(pageNumber) {
    const url = `https://asuratoon.com/page/${pageNumber}/`;
    let m_list = [];

    try {
        // Scrape manga items on the current page
        const mangaPageData = await scrapeCurrentPage(url);
        m_list = mangaPageData.list;

        return m_list;
    } catch (error) {
        console.error('An error occurred:', error);
        return [];
    }
}

async function scrapeCurrentPage(url) {
    let m_list = [];

    try {
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        const content = await page.content();
        const $ = cheerio.load(content);

        $('.uta').each((index, element) => {
            const $item = $(element);
            let image = $item.find('.imgu img').attr('src');
            // Remove the dimensions from the image URL
            image = image.replace(/-\d+x\d+/, '');

            const url = $item.find('.luf a.series').attr('href');
            const title = $item.find('.luf a.series h4').text().trim();
            const chapters = $item.find('.luf ul.Manhwa li').map((j, e) => {
                const $chapter = $(e);
                return {
                    c_title: $chapter.find('a').text().trim(),
                    c_url: $chapter.find('a').attr('href'),
                    c_date: $chapter.find('span').text().trim()
                };
            }).get();

            m_list.push({
                'title': title,
                'image': image,
                'url': url,
                'chapters': chapters
            });
        });

        await browser.close();
    } catch (error) {
        console.error('An error occurred:', error);
    }

    return {
        'list': m_list
    };
}

 export { scrapeMangaItems };











export const scrapeSearch = async ({ list = [], keyw, page = 1 }) => {
  try {
    const searchPage = await axios.get(
      `${BASE_URL + search_path}?keyword=${keyw}&page=${page}`
    );
    const $ = cheerio.load(searchPage.data);

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        anime_id: $(el).find('p.name > a').attr('href').split('/')[2],
        name: $(el).find('p.name > a').attr('title'),
        img_url: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim(),
      });
    });

    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeRecentRelease = async ({ list = [], page = 1, type = 1 }) => {
  try {
    const mainPage = await axios.get(`
        ${recent_release_url}?page=${page}&type=${type}
        `);
    const $ = cheerio.load(mainPage.data);

    $('div.last_episodes.loaddub > ul > li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[1].split('-episode-')[0],
        episodeId: $(el).find('p.name > a').attr('href').split('/')[1],
        name: $(el).find('p.name > a').attr('title'),
        episodeNum: $(el).find('p.episode').text().replace('Episode ', '').trim(),
        subOrDub: $(el).find('div > a > div').attr('class').replace('type ic-', ''),
        imgUrl: $(el).find('div > a > img').attr('src')
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};



export const scrapeAnimeList = async ({ list = [], page = 1 }) => {
  try {
    const AnimeList = await axios.get(`${BASE_URL}/anime-list.html?page=${page}`);
    const $ = cheerio.load(AnimeList.data);

    $('div.anime_list_body > ul.listing > li').each((i, el) => {
      list.push({
        animeTitle: $(el).find('a').html().replace(/"/g, ""),
        animeId: $(el).find('a').attr('href').replace("/category/", ""),
        liTitle: $(el).attr('title')
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeAnimeAZ = async ({ list = [], aph, page = 1 }) => {
  try {
    const AnimeAZ = await axios.get(`${BASE_URL}/anime-list-${aph}?page=${page}`);
    const $ = cheerio.load(AnimeAZ.data);

    $('div.anime_list_body > ul.listing > li').each((i, el) => {
      list.push({
        animeTitle: $(el).find('a').html().replace(/"/g, ""),
        animeId: $(el).find('a').attr('href').replace("/category/", ""),
        liTitle: $(el).attr('title')
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeRecentlyAdded = async ({list = [], page = 1}) => {
  try {
    const RecentlyAdded = await axios.get(`${BASE_URL}/?page=${page}`);
    const $ = cheerio.load(RecentlyAdded.data);

    $('div.added_series_body.final ul.listing li').each((i, el) => {
      list.push({
        animeId: $(el).find('a').attr('href'),
        animeName: $(el).find('a').text()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeOngoingSeries = async ({list = [], page = 1}) => {
  try {
    const OngoingSeries = await axios.get(`${BASE_URL}/?page=${page}`);
    const $ = cheerio.load(OngoingSeries.data);

    $('nav.menu_series.cron ul li').each((i, el) => {
      list.push({
        animeId: $(el).find('a').attr('href'),
        animeName: $(el).find('a').text()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeNewSeason = async ({ list = [], page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + new_season_path}?page=${page}
        `);
    const $ = cheerio.load(popularPage.data);

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[2],
        animeTitle: $(el).find('p.name > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeOngoingAnime = async ({ list = [], page = 1 }) => {
  try {
    const OngoingAnime = await axios.get(`${BASE_URL}/ongoing-anime.html?page=${page}`);
    const $ = cheerio.load(OngoingAnime.data);

    $('div.main_body div.last_episodes ul.items li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[2],
        animeTitle: $(el).find('p.name > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeCompletedAnime = async ({ list = [], page = 1 }) => {
  try {
    const CompletedAnime = await axios.get(`${BASE_URL}/completed-anime.html?page=${page}`);
    const $ = cheerio.load(CompletedAnime.data);

    $('div.main_body div.last_episodes ul.items li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[2],
        animeTitle: $(el).find('p.name > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapePopularAnime = async ({ list = [], page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + popular_path}?page=${page}
       `);
    const $ = cheerio.load(popularPage.data);

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[2],
        animeTitle: $(el).find('p.name > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim()
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeAnimeMovies = async ({ list = [], aph = '', page = 1 }) => {
  try {
    const popularPage = await axios.get(`
        ${BASE_URL + anime_movies_path}?aph=${aph.trim().toUpperCase()}&page=${page}
        `);
    const $ = cheerio.load(popularPage.data);

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        animeId: $(el).find('p.name > a').attr('href').split('/')[2],
        animeTitle: $(el).find('p.name > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').text().trim(),
      });
    });
    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeTopAiringAnime = async ({ list = [], page = 1 }) => {
  try {
    if (page == -1) {
      let pageNum = 1;
      let hasMore = true;
      while (hasMore) {
        const popular_page = await axios.get(`
                ${popular_ongoing_url}?page=${pageNum}
                `);
        const $ = cheerio.load(popular_page.data);

        if ($('div.added_series_body.popular > ul > li').length == 0) {
          hasMore = false;
          continue;
        }
        $('div.added_series_body.popular > ul > li').each((i, el) => {
          let genres = [];
          $(el)
            .find('p.genres > a')
            .each((i, el) => {
              genres.push($(el).attr('title'));
            });
          list.push({
            animeId: $(el).find('a:nth-child(1)').attr('href').split('/')[2],
            animeTitle: $(el).find('a:nth-child(1)').attr('title'),
            animeImg: $(el)
              .find('a:nth-child(1) > div')
              .attr('style')
              .match('(https?://.*.(?:png|jpg))')[0],
            latestEp: $(el).find('p:nth-child(4) > a').text().trim(),
            animeUrl: BASE_URL + '/' + $(el).find('a:nth-child(1)').attr('href'),
            genres: genres,
          });
        });
        pageNum++;
      }
      return list;
    }

    const popular_page = await axios.get(`
        ${popular_ongoing_url}?page=${page}
        `);
    const $ = cheerio.load(popular_page.data);

    $('div.added_series_body.popular > ul > li').each((i, el) => {
      let genres = [];
      $(el)
        .find('p.genres > a')
        .each((i, el) => {
          genres.push($(el).attr('title'));
        });
      list.push({
        animeId: $(el).find('a:nth-child(1)').attr('href').split('/')[2],
        animeTitle: $(el).find('a:nth-child(1)').attr('title'),
        animeImg: $(el)
          .find('a:nth-child(1) > div')
          .attr('style')
          .match('(https?://.*.(?:png|jpg))')[0],
        latestEp: $(el).find('p:nth-child(4) > a').text().trim(),
        animeUrl: BASE_URL + '/' + $(el).find('a:nth-child(1)').attr('href'),
        genres: genres,
      });
    });

    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeGenre = async ({ list = [], genre, page = 1 }) => {
  try {
    genre = genre.trim().replace(/ /g, '-').toLowerCase();

    if (Genres.indexOf(genre) > -1) {
      const genrePage = await axios.get(`${BASE_URL}genre/${genre}?page=${page}`);
      const $ = cheerio.load(genrePage.data);

      $('div.last_episodes > ul > li').each((i, elem) => {
        list.push({
          animeId: $(elem).find('p.name > a').attr('href').split('/')[2],
          animeTitle: $(elem).find('p.name > a').attr('title'),
          animeImg: $(elem).find('div > a > img').attr('src'),
          releasedDate: $(elem).find('p.released').text().trim(),
          animeUrl: BASE_URL + '/' + $(elem).find('p.name > a').attr('href'),
        });
      });
      return list;
    }
    return { error: 'Genre Not Found' };
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

// scrapeGenre({ genre: "cars", page: 1 }).then((res) => console.log(res))

/**
 * @param {string} id anime id.
 * @returns Resolves when the scraping is complete.
 * @example
 * scrapeGoGoAnimeInfo({id: "naruto"})
 * .then((res) => console.log(res)) // => The anime information is returned in an Object.
 * .catch((err) => console.log(err))
 *
 */
export const scrapeAnimeDetails = async ({ id }) => {
  try {
    const animePage = await axios.get(`https://hianime.to/${id}`);
    const $ = cheerio.load(animePage.data);

    const animeTitle = $('h2.film-name.dynamic-name').text().trim();
    const japaneseTitle = $('.anisc-info .item-title:nth-child(2) .name').text().trim();
    const synonyms = $('.anisc-info .item-title:nth-child(3) .name').text().trim();
    const imageUrl = $('.film-poster-img').attr('src');
    const premiered = $('.anisc-info .item-title:nth-child(5) .name').text().trim();
    const aired = $('.anisc-info .item-title:nth-child(4) .name').text().trim();
    const duration = $('.anisc-info .item-title:nth-child(6) .name').text().trim();
    const status = $('.anisc-info .item-title:nth-child(7) .name').text().trim();
    const malScore = $('.anisc-info .item-title:nth-child(8) .name').text().trim();

    // Extracting genres
    const genres = $('.anisc-info .item-list a').map(function() {
      return $(this).text().trim();
    }).get();

    // Extracting producers
    const producers = $('.anisc-info .item-title:nth-child(11) .name').map(function() {
      return $(this).text().trim();
    }).get();

    // Extracting studios
    const studios = $('.anisc-info .item-title:nth-child(10) .name').map(function() {
      return $(this).text().trim();
    }).get();

    // Constructing the synopsis
    const synopsis = $('.film-description .text').text().trim();

    // Extracting anime ID from the URL
    const animeId = id;

    // Constructing anime URL
    const animeUrl = `https://hianime.to/${id}`;

    // Extracting anime type
    const type = $('.film-stats .item:contains("TV")').text().trim(); // Adjust this according to the actual HTML structure

    return {
      animeId: animeId,
      animeUrl: animeUrl,
      name: animeTitle,
      japaneseTitle: japaneseTitle,
      synonyms: synonyms,
      imageUrl: imageUrl,
      aired: aired,
      premiered: premiered,
      duration: duration,
      status: status,
      synopsis: synopsis,
      malScore: malScore,
      genres: genres,
      producers: producers,
      studios: studios,
      type: type
    };
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeSeason = async ({ list = [], season, page = 1 }) => {
  try {
    const season_page = await axios.get(`${seasons_url}${season}?page=${page}`);
    const $ = cheerio.load(season_page.data);

    $('div.last_episodes > ul > li').each((i, el) => {
      list.push({
        animeId: $(el).find('div > a').attr('href').split('/')[2],
        animeTitle: $(el).find('div > a').attr('title'),
        imgUrl: $(el).find('div > a > img').attr('src'),
        status: $(el).find('p.released').html().trim(),
      });
    });

    return list;
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeThread = async ({ episodeId, page = 0 }) => {
  try {
    let threadId = null;

    const thread_page = await axios.get(disqus_iframe(decodeURIComponent(episodeId)));
    const $ = cheerio.load(thread_page.data, { xmlMode: true });

    const thread = JSON.parse($('#disqus-threadData')[0].children[0].data);

    if (thread.code === 0 && thread.cursor.total > 0) {
      threadId = thread.response.thread.id;
    }

    const thread_api_res = (await axios.get(disqus_api(threadId, page))).data;

    return {
      threadId: threadId,
      currentPage: page,
      hasNextPage: thread_api_res.cursor.hasNext,
      comments: thread_api_res.response,
    };
  } catch (err) {
    if (err.response.status === 400) {
      return { error: 'Invalid page. Try again.' };
    }
    return { error: err };
  }
};


export const scrapeWatchAnime = async ({ id }) => {
  try {
    let genres = [];
    let epList = [];

    const WatchAnime = await axios.get(`https://anitaku.so/${id}`);

    const $ = cheerio.load(WatchAnime.data);

    const anime_category = $('div.anime-info a').attr('href').replace('/category/', '')
    const episode_page = $('ul#episode_page').html()
    const movie_id = $('#movie_id').attr('value');
    const alias = $('#alias_anime').attr('value');
    const episode_link = $('div.play-video > iframe').attr('src')
    const gogoserver = $('li.vidcdn > a').attr('data-video')
    const streamsb = $('li.streamsb > a').attr('data-video')
    const xstreamcdn = $('li.xstreamcdn > a').attr('data-video')
    const anime_name_with_ep = $('div.title_name h2').text()
    const ep_num = $('div.anime_video_body > input.default_ep').attr('value')
    const download = $('li.dowloads a').attr('href')
    const nextEpText = $('div.anime_video_body_episodes_r a').text()
    const nextEpLink = $('div.anime_video_body_episodes_r > a').attr('href')
    const prevEpText = $('div.anime_video_body_episodes_l a').text()
    const prevEpLink = $('div.anime_video_body_episodes_l > a').attr('href')

    return {
      video: episode_link,
      gogoserver: gogoserver,
      streamsb: streamsb,
      xstreamcdn: xstreamcdn,
      animeNameWithEP: anime_name_with_ep.toString(),
      ep_num: ep_num,
      ep_download: download,
      anime_info: anime_category,
      movie_id: movie_id,
      alias: alias,
      episode_page: episode_page,
      nextEpText: nextEpText,
      nextEpLink: nextEpLink,
      prevEpLink: prevEpLink,
      prevEpText: prevEpText,

    };
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeSearchPage = async ({ keyw, page }) => {
  try {
    const SearchPage = await axios.get(`${BASE_URL + search_path}?keyword=${keyw}&page=${page}`);

    const $ = cheerio.load(SearchPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapePopularPage = async ({ page }) => {
  try {
    const PopularPage = await axios.get(`${BASE_URL}/popular.html?page=${page}`);

    const $ = cheerio.load(PopularPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeCompletedPage = async ({ page }) => {
  try {
    const CompletedPage = await axios.get(`${BASE_URL}/completed-anime.html?page=${page}`);

    const $ = cheerio.load(CompletedPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeOngoingPage = async ({ page }) => {
  try {
    const OngoingPage = await axios.get(`${BASE_URL}/ongoing-anime.html?page=${page}`);

    const $ = cheerio.load(OngoingPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeMoviePage = async ({ page }) => {
  try {
    const MoviePage = await axios.get(`${BASE_URL}/anime-movies.html?aph=&page=${page}`);

    const $ = cheerio.load(MoviePage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};


export const scrapeSubCategoryPage = async ({ subCategory, page }) => {
  try {
    const SubCategoryPage = await axios.get(`${BASE_URL}/sub-category/${subCategory}?page=${page}`);

    const $ = cheerio.load(SubCategoryPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeRecentPage = async ({ page, type }) => {
  try {
    const RecentPage = await axios.get(`${recent_release_url}?page=${page}&type=${type}`);

    const $ = cheerio.load(RecentPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeNewSeasonPage = async ({ page }) => {
  try {
    const NewSeasonPage = await axios.get(`${BASE_URL}/new-season.html?page=${page}`);

    const $ = cheerio.load(NewSeasonPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeGenrePage = async ({ genre, page }) => {
  try {
    const GenrePage = await axios.get(`${BASE_URL}/genre/${genre}?page=${page}`);

    const $ = cheerio.load(GenrePage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeAnimeListPage = async ({ page }) => {
  try {
    const AnimeListPage = await axios.get(`${BASE_URL}/anime-list.html?page=${page}`);

    const $ = cheerio.load(AnimeListPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};

export const scrapeAnimeAZPage = async ({ aph, page = 1 }) => {
  try {
    const AnimeAZPage = await axios.get(`${BASE_URL}/anime-list-${aph}?page=${page}`);

    const $ = cheerio.load(AnimeAZPage.data);

    const pagination = $('ul.pagination-list').html()

    return {
      pagination: pagination.replace("selected", "active"),
    }
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};





export async function scrapeEpisodeData(id) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://9animetv.to/watch/${id}`);

  // Wait for the dynamic content to load
  await page.waitForSelector('.episodes-ul a.item.ep-item');

  // Extract episode data
  const episodeData = await page.evaluate(() => {
    const episodes = document.querySelectorAll('.episodes-ul a.item.ep-item');
    const data = [];
    episodes.forEach(episode => {
      const episodeUrl = episode.getAttribute('href');
      const dataId = episode.getAttribute('data-id');
      const title = episode.getAttribute('title');
      const episodeNumber = episode.querySelector('.order').textContent;
      data.push({
        episodeUrl,
        dataId,
        title,
        episodeNumber
      });
    });
    return data;
  });

  await browser.close();
  return episodeData;
}


export const scrapeAnimeDetailsWithEpisodes = async ({ id }) => {
  try {
    const animeDetail = await scrapeAnimeDetail({ id });
    const episodeDat = await scrapeEpisodeDat(animeDetail.animeId);
    return { ...animeDetail, episodes: episodeDat };
  } catch (error) {
    console.error('Error:', error);
    return { error: 'Failed to fetch anime details and episodes.' };
  }
};

const scrapeEpisodeDat = async (id) => {
const browser = await puppeteer.launch({
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
  ],
});
  const page = await browser.newPage();
  await page.goto(`https://9animetv.to/watch/${id}`);

  // Wait for the dynamic content to load
  await page.waitForSelector('.episodes-ul a.item.ep-item');

  // Extract episode data
  const episodeData = await page.evaluate(() => {
    const episodes = document.querySelectorAll('.episodes-ul a.item.ep-item');
    const data = [];
    episodes.forEach(episode => {
      const episodeUrl = episode.getAttribute('href');
      const episodeID = episodeUrl.split('/watch/')[1];
      const dataId = episode.getAttribute('data-id');
      const title = episode.getAttribute('title');
      const episodeNumber = episode.querySelector('.order').textContent;
      data.push({
        episodeID: episodeID,
        dataId,
        title,
        episodeNumber
      });
    });
    return data;
  });

  await browser.close();
  return episodeData;
};

const scrapeAnimeDetail = async ({ id }) => {
  try {
    const animePage = await axios.get(`https://hianime.to/${id}`);
    const $ = cheerio.load(animePage.data);

    const animeTitle = $('h2.film-name.dynamic-name').text().trim();
    const japaneseTitle = $('.anisc-info .item-title:nth-child(2) .name').text().trim();
    const synonyms = $('.anisc-info .item-title:nth-child(3) .name').text().trim();
    const imageUrl = $('.film-poster-img').attr('src');
    const premiered = $('.anisc-info .item-title:nth-child(5) .name').text().trim();
    const aired = $('.anisc-info .item-title:nth-child(4) .name').text().trim();
    const duration = $('.anisc-info .item-title:nth-child(6) .name').text().trim();
    const status = $('.anisc-info .item-title:nth-child(7) .name').text().trim();
    const malScore = $('.anisc-info .item-title:nth-child(8) .name').text().trim();

    // Extracting genres
    const genres = $('.anisc-info .item-list a').map(function() {
      return $(this).text().trim();
    }).get();

    // Extracting producers
    const producers = $('.anisc-info .item-title:nth-child(11) .name').map(function() {
      return $(this).text().trim();
    }).get();

    // Extracting studios
    const studios = $('.anisc-info .item-title:nth-child(10) .name').map(function() {
      return $(this).text().trim();
    }).get();

    // Constructing the synopsis
    const synopsis = $('.film-description .text').text().trim();

    // Extracting anime ID from the URL
    const animeId = id;

    // Constructing anime URL
    const animeUrl = `https://hianime.to/${id}`;

    // Extracting anime type
    const type = $('.film-stats .item:contains("TV")').text().trim(); // Adjust this according to the actual HTML structure

    return {
      animeId: animeId,
      animeUrl: animeUrl,
      name: animeTitle,
      japaneseTitle: japaneseTitle,
      synonyms: synonyms,
      imageUrl: imageUrl,
      aired: aired,
      premiered: premiered,
      duration: duration,
      status: status,
      synopsis: synopsis,
      malScore: malScore,
      genres: genres,
      producers: producers,
      studios: studios,
      type: type
    };
  } catch (err) {
    console.log(err);
    return { error: err };
  }
};
