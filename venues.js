/* Conference host locations. Coordinates are approximate population-centre locations
 * in decimal degrees, never an inferred street address. Add aliases after |.
 * Unresolved, country-only and virtual venues intentionally remain unplotted. */
(() => {
  'use strict';
  const groups = {
    US: `
Alexandria VA 38.805 -77.047|Alexandria
Anaheim 33.837 -117.915
Ann Arbor 42.281 -83.743
Atlanta 33.749 -84.388
Austin 30.267 -97.743
Baltimore 39.290 -76.612
Bellevue 47.611 -122.202
Boca Raton 26.368 -80.128
Boise 43.615 -116.202
Boston 42.360 -71.059
Boulder 40.015 -105.271
Canandaigua 42.887 -77.282
Charlotte 35.227 -80.843
Chicago 41.878 -87.630
Cleveland 41.500 -81.694
Columbia SC 34.001 -81.035|Columbia
Dallas 32.777 -96.797
Dallas–Fort Worth 32.900 -97.040|Dallas Fort Worth
Denver 39.739 -104.990
Detroit 42.331 -83.046
Fort Collins 40.585 -105.084
Fort Worth 32.755 -97.331
Honolulu 21.307 -157.858|Waikiki
Huntington Beach 33.660 -117.999
Indianapolis 39.769 -86.158
Irvine 33.684 -117.827
Long Beach 33.770 -118.194
Los Angeles 34.052 -118.244
Minneapolis 44.978 -93.265
Monterey 36.600 -121.895
New Brunswick 40.486 -74.452
New Orleans 29.951 -90.072
New York City 40.713 -74.006|New York
Oakland 37.804 -122.271
Palo Alto 37.442 -122.143
Philadelphia 39.953 -75.165
Phoenix 33.448 -112.074
Pittsburgh 40.441 -79.996
Providence 41.824 -71.413
Provo 40.234 -111.659
Raleigh 35.780 -78.639
Renton 47.483 -122.217
Richmond VA 37.541 -77.436|Richmond
Riverside 33.981 -117.375
Salt Lake City 40.761 -111.891
San Antonio 29.424 -98.494
San Diego 32.716 -117.161
San Francisco 37.775 -122.419
San Jose 37.338 -121.886
Santa Barbara 34.421 -119.698
Santa Clara 37.354 -121.955
Santa Cruz 36.974 -122.031
Seaside 36.611 -121.851
Seattle 47.606 -122.332
Snowbird 40.583 -111.655
St. Simons Island 31.152 -81.369|Saint Simons Island
Stanford 37.427 -122.170
Tempe 33.425 -111.940
Washington DC 38.907 -77.037|Washington D C
West Palm Beach 26.715 -80.053
Albuquerque 35.084 -106.650
Anchorage 61.218 -149.900
Arlington VA 38.880 -77.107|Arlington
Bedford PA 40.018 -78.503|Bedford
Buffalo 42.886 -78.879
Cambridge MA 42.374 -71.110|Cambridge
Clearwater 27.966 -82.800|Clearwater Beach
College Park MD 38.981 -76.937|College Park
Fayetteville 36.062 -94.158
Flagstaff 35.198 -111.651
Grand Rapids 42.963 -85.668
Greenville SC 34.853 -82.394|Greenville
Herndon 38.969 -77.387
Hilton Head Island 32.216 -80.753
Houston 29.760 -95.370
Jersey City 40.717 -74.043
Las Vegas 36.170 -115.140
Madison 43.073 -89.401
Menlo Park 37.453 -122.182
Miami 25.762 -80.192
Nashville 36.163 -86.782
Newark NJ 40.736 -74.173|Newark
Notre Dame 41.705 -86.235
Orlando 28.538 -81.379
Pasadena 34.148 -118.145
Portland OR 45.515 -122.678|Portland
Redmond 47.674 -122.122
Richardson 32.948 -96.730
Sacramento 38.582 -121.494
South San Francisco 37.655 -122.409
St. Louis 38.627 -90.199|Saint Louis
Stony Brook 40.925 -73.141
Tucson 32.222 -110.975`,
    CA: `
Calgary 51.045 -114.072
Hamilton ON 43.255 -79.871|Hamilton
Kingston ON 44.231 -76.486|Kingston
Kitchener–Waterloo 43.455 -80.506|Kitchener Waterloo
Montréal 45.502 -73.567
Ottawa 45.422 -75.697
Sooke 48.377 -123.728
St. John’s 47.562 -52.713|St Johns
Toronto 43.653 -79.383
Vancouver 49.283 -123.121
Waterloo 43.464 -80.520
Winnipeg 49.895 -97.138
Banff 51.178 -115.571
Edmonton 53.547 -113.494
Halifax 44.648 -63.575
Kelowna 49.888 -119.496
Niagara Falls 43.089 -79.085`,
    CN: `
Beijing 39.904 116.407
Changsha 28.228 112.939
Chengdu 30.573 104.067
Chongqing 29.563 106.552
Foshan 23.022 113.122
Fuzhou 26.075 119.297
Guangzhou 23.129 113.264
Guiyang 26.647 106.630
Hangzhou 30.274 120.155
Harbin 45.804 126.535
Hefei 31.820 117.227
Hengqin 22.118 113.535
Hong Kong 22.319 114.169
Hsinchu 24.804 120.971
Jinan 36.651 117.120
Kaohsiung 22.627 120.301
Kunming 25.038 102.718
Luoyang 34.619 112.454
Macao 22.199 113.543|Macau
Ningbo 29.868 121.544
Shanghai 31.230 121.474
Shenyang 41.805 123.432
Shenzhen 22.543 114.058
Taipei 25.033 121.565
Taipa 22.155 113.557
Xi'an 34.342 108.940|Xian
Xiamen 24.480 118.089
Huangshan 29.715 118.338
Jinhua 29.079 119.647
Kaifeng 34.798 114.307
Nanjing 32.060 118.797
Qingdao 36.067 120.383
Sanya 18.253 109.512
Suzhou 31.299 120.585
Tainan 22.999 120.227
Tianjin 39.084 117.201
Ürümqi 43.825 87.617|Urumchi
Wuhan 30.593 114.305
Wuzhen 30.746 120.489
Xiangtan 27.830 112.944
Yinchuan 38.487 106.231
Zhengzhou 34.747 113.625
Zhenjiang 32.188 119.425
Zhuhai 22.271 113.577`,
    DE: `
Aachen 50.776 6.084
Berlin 52.520 13.405
Bonn 50.737 7.099
Bremen 53.080 8.802
Burghausen 48.169 12.831
Dresden 51.051 13.738
Frankfurt am Main 50.110 8.682|Frankfurt
Hannover 52.376 9.732|Hanover
Karlsruhe 49.007 8.404
Munich 48.137 11.576|München
Saarbrücken 49.240 6.997
Stuttgart 48.775 9.182
Aerzen 52.050 9.262`,
    FR: `
Bordeaux 44.838 -0.579
Lille 50.630 3.057
Lyon 45.764 4.836
Paris 48.857 2.352
Rennes 48.117 -1.678
Saint-Malo 48.650 -2.026
Strasbourg 48.573 7.752
Biarritz 43.483 -1.559
Caen 49.183 -0.371
Compiègne 49.418 2.826
Nancy 48.692 6.184
Nantes 47.218 -1.553
Toulouse 43.604 1.444`,
    GB: `
Belfast 54.597 -5.930
Brighton 50.823 -0.137
Cambridge 52.205 0.122
Durham 54.775 -1.584
Edinburgh 55.953 -3.189
Egham 51.431 -0.547
Exeter 50.719 -3.534
Glasgow 55.864 -4.252
Lancaster 54.047 -2.801
Liverpool 53.408 -2.992
London 51.507 -0.128
Nottingham 52.955 -1.159
Southampton 50.910 -1.404
Swansea 51.621 -3.944
Birmingham 52.486 -1.890
Bristol 51.454 -2.588
Newcastle upon Tyne 54.978 -1.618
Oxford 51.752 -1.258
Sheffield 53.381 -1.470
York 53.960 -1.088`,
    IT: `
Bari 41.117 16.872
Benevento 41.130 14.782
Bologna 44.495 11.343
Catania 37.508 15.083
Florence 43.770 11.256|Firenze
L'Aquila 42.350 13.400
Lucca 43.844 10.504
Milan 45.464 9.190|Milano
Naples 40.852 14.269|Napoli
Padua 45.407 11.876|Padova
Palermo 38.116 13.362
Pisa 43.716 10.401
Rende 39.330 16.181
Rome 41.903 12.496|Roma
Trento 46.067 11.121
Turin 45.071 7.686|Torino
Urbino 43.727 12.637
Venice 45.440 12.316
Verona 45.438 10.991
Cagliari 39.224 9.121
Ischia 40.738 13.950
Paestum 40.421 15.006
Pompeii 40.749 14.500|Pompei
Rimini 44.067 12.568
Salerno 40.682 14.768`,
    ES: `
Barcelona 41.387 2.170
Bilbao 43.263 -2.935
Madrid 40.417 -3.704
Málaga 36.722 -4.421
San Sebastián 43.318 -1.982|Donostia
Seville 37.389 -5.984|Sevilla
Tarragona 41.119 1.245
Baiona 42.118 -8.849
Girona 41.979 2.820
Santiago de Compostela 42.879 -8.545
Valencia 39.470 -0.376
Zaragoza 41.649 -0.889`,
    NL: `
Amsterdam 52.367 4.904
Delft 52.012 4.357
Eindhoven 51.441 5.469
The Hague 52.071 4.300|Hague
Leiden 52.161 4.497
Maastricht 50.851 5.691
Nijmegen 51.813 5.838
Utrecht 52.090 5.121
Enschede 52.221 6.894
Groningen 53.219 6.567
Rotterdam 51.924 4.478`,
    JP: `
Fukui 36.065 136.222
Kobe 34.690 135.196
Kyoto 35.012 135.768
Osaka 34.694 135.502
Tokyo 35.676 139.692
Yokohama 35.444 139.638
Gifu 35.424 136.761
Hiroshima 34.385 132.455
Kanazawa 36.562 136.656
Miyakojima 24.805 125.281
Nara 34.685 135.805
Tsukuba 36.084 140.077`,
    AU: `
Brisbane -27.470 153.025
Cairns -16.920 145.771
Gold Coast -28.017 153.400
Melbourne -37.814 144.963
Perth -31.950 115.861
Sydney -33.869 151.209
Canberra -35.281 149.130
Wollongong -34.427 150.894`,
    NZ: `
Auckland -36.849 174.763
Hamilton NZ -37.787 175.279|Hamilton
Wellington -41.287 174.776`,
    FI: `
Helsinki 60.170 24.938
Tampere 61.498 23.761
Espoo 60.206 24.656
Rovaniemi 66.503 25.729`,
    SE: `
Linköping 58.410 15.622
Malmö 55.605 13.004
Stockholm 59.329 18.069`,
    CH: `
Basel 47.560 7.589
Bern 46.948 7.448
Geneva 46.204 6.143
Lugano 46.004 8.952
Davos 46.803 9.836
Lausanne 46.520 6.633
Winterthur 47.499 8.729
Zürich 47.376 8.541`,
    AT: `
Graz 47.071 15.440
Vienna 48.208 16.374|Wien
Linz 48.307 14.286
Hagenberg 48.367 14.517`,
    GR: `
Athens 37.984 23.728
Chania 35.513 24.019
Heraklion 35.338 25.144
Thessaloniki 40.641 22.944
Mytilene 39.108 26.555`,
    BE: `
Brussels 50.850 4.352
Ghent 51.054 3.717
Charleroi 50.410 4.445
Leuven 50.880 4.701`,
    PT: `
Coimbra 40.203 -8.410
Lisbon 38.723 -9.139
Porto 41.157 -8.629
Vilamoura 37.077 -8.119
Funchal 32.650 -16.909`,
    PL: `
Kraków 50.065 19.945
Łódź 51.759 19.456|Lodz
Poznań 52.406 16.925
Bydgoszcz 53.123 18.008
Warsaw 52.230 21.012`,
    KR: `
Busan 35.180 129.076
Daegu 35.872 128.602
Daejeon 36.350 127.385
Seoul 37.566 126.978
Incheon 37.456 126.705
Suwon 37.264 127.029`,
    IN: `
Bengaluru 12.972 77.595|Bangalore
New Delhi 28.614 77.209
Ahmedabad 23.023 72.571
Hyderabad 17.385 78.487
Kolkata 22.573 88.364
Pune 18.520 73.857`,
    BR: `
Foz do Iguaçu -25.517 -54.585
Rio de Janeiro -22.907 -43.173
São Paulo -23.551 -46.633
Belo Horizonte -19.917 -43.935
Porto de Galinhas -8.505 -35.004`,
    DK: `
Copenhagen 55.676 12.568
Aarhus 56.163 10.204
Odense 55.404 10.403`,
    VN: `
Da Nang 16.054 108.202|Danang
Hanoi 21.028 105.834
Ho Chi Minh City 10.823 106.630`,
    MX: `
Cancún 21.162 -86.852
Mexico City 19.433 -99.133
Mérida 20.968 -89.624
Santa María Huatulco 15.834 -96.327`,
    CZ: `
Prague 50.076 14.438
Pilsen 49.738 13.373|Plzen
Brno 49.195 16.607`,
    MA: `
Marrakesh 31.630 -7.981|Marrakech
Rabat 34.021 -6.842
Tangier 35.760 -5.834`,
    AE: `
Dubai 25.205 55.271
Abu Dhabi 24.454 54.377`,
    HR: `
Dubrovnik 42.651 18.094
Zagreb 45.815 15.982`,
    CY: `
Limassol 34.707 33.022
Paphos 34.775 32.424`,
    ZA: `
Cape Town -33.925 18.424
Stellenbosch -33.932 18.860`,
    TR: `
Antalya 36.897 30.713
Istanbul 41.009 28.978`,
    MY: `
Kuala Lumpur 3.139 101.687
Kuching 1.554 110.360`,
    NO: `
Bergen 60.392 5.323
Røros 62.575 11.384
Tromsø 69.650 18.955
Trondheim 63.430 10.396`,
    LT: `
Kaunas 54.898 23.904
Vilnius 54.687 25.280`,
    TH: `
Bangkok 13.756 100.502
Mai Khao 8.167 98.298
Phuket 7.880 98.392`,
    AR: 'Buenos Aires -34.604 -58.382',
    CL: 'Santiago -33.449 -70.669',
    CR: 'San José 9.929 -84.090',
    EE: 'Tallinn 59.437 24.754',
    EG: 'Sharm El-Sheikh 27.915 34.330',
    FJ: 'Nadi -17.777 177.436',
    HU: 'Budapest 47.498 19.040',
    ID: 'Bandung -6.917 107.619',
    IE: 'Dublin 53.350 -6.260',
    IS: 'Reykjavík 64.147 -21.943',
    KH: 'Siem Reap 13.364 103.860',
    LU: 'Luxembourg City 49.612 6.132',
    PA: 'Panama City 8.983 -79.520',
    QA: 'Doha 25.285 51.531',
    RS: 'Belgrade 44.787 20.449',
    SG: 'Singapore 1.352 103.820',
    SI: 'Maribor 46.554 15.646',
    TN: 'Tunis 36.807 10.182',
    UY: 'Montevideo -34.901 -56.165',
    CW: 'Willemstad 12.109 -68.932',
  };

  const countries = {
    US:'United States of America|United States|United State|USA|U S A',
    CA:'Canada', CN:'China|Taiwan|People s Republic of China', DE:'Germany',
    FR:'France', GB:'United Kingdom|UK|England|Scotland|Wales|Northern Ireland',
    IT:'Italy', ES:'Spain', NL:'Netherlands', JP:'Japan', AU:'Australia',
    NZ:'New Zealand', FI:'Finland', SE:'Sweden', CH:'Switzerland', AT:'Austria',
    GR:'Greece', BE:'Belgium', PT:'Portugal', PL:'Poland', KR:'Korea',
    IN:'India', BR:'Brazil', DK:'Denmark', VN:'Vietnam|Viet Nam', MX:'Mexico',
    CZ:'Czech Republic|Czechia', MA:'Morocco', AE:'UAE|United Arab Emirates',
    HR:'Croatia', CY:'Cyprus', ZA:'South Africa', TR:'Turkey|Türkiye',
    MY:'Malaysia', NO:'Norway', LT:'Lithuania', TH:'Thailand',
    AR:'Argentina', CL:'Chile', CR:'Costa Rica', EE:'Estonia', EG:'Egypt',
    FJ:'Fiji', HU:'Hungary', ID:'Indonesia', IE:'Ireland', IS:'Iceland',
    KH:'Cambodia', LU:'Luxembourg', PA:'Panama', QA:'Qatar', RS:'Serbia',
    SG:'Singapore', SI:'Slovenia', TN:'Tunisia', UY:'Uruguay', CW:'Curaçao',
  };
  const usStates = new Set(('alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming').split('|'));
  function normalize(text) {
    return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/ø/g,'o').replace(/ł/g,'l')
      .replace(/[‘’'ʼ]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
  }

  const entries = new Map();
  for (const [country, block] of Object.entries(groups)) {
    for (const line of block.trim().split('\n')) {
      const [base, ...aliases] = line.trim().split('|');
      const [,name,lat,lon] = base.match(/^(.+?) ([-\d.]+) ([-\d.]+)$/);
      const point = Object.freeze({name, lat:Number(lat), lon:Number(lon), country});
      for (const alias of new Set([name,...aliases].map(normalize))) {
        if (!entries.has(alias)) entries.set(alias,[]);
        entries.get(alias).push(point);
      }
    }
  }
  const countryTerms = Object.entries(countries).flatMap(([code,aliases]) =>
    aliases.split('|').map(alias => [code,normalize(alias)]));
  const aliases = [...entries.keys()].sort((a,b) => b.length - a.length);
  const words = (text,term) => (' '+text+' ').includes(' '+term+' ');
  const cache = new Map();

  function resolve(section) {
    const whole = normalize(section);
    const context = new Set(countryTerms.filter(([,term]) => words(whole,term)).map(([code])=>code));
    // "Northern Ireland" identifies the UK's Belfast venue.
    if (words(whole,'northern ireland')) context.delete('IE');
    if (!context.size && /(?:,\s*(?:CA|MA|NY|CO|PA|TX|FL|WA|OR|VA|AZ|MI|MD|IL|NJ|NC|SC|UT)\b)/i.test(section)) context.add('US');
    if (!context.size && /(?:,\s*(?:BC|ON|QC|NL)\b)/i.test(section)) context.add('CA');
    if (!context.size && /,\s*(?:california|massachusetts|oregon|colorado|utah|alaska)\b/i.test(section)) context.add('US');

    function qualify(key) {
      let matches = entries.get(key) || [];
      if (context.size) matches = matches.filter(p => context.has(p.country));
      if (!context.size && ['san jose','cambridge','hamilton','alexandria','richmond','columbia','kingston','portland','arlington','bedford','greenville','newark','york'].includes(key)) return null;
      return matches.length===1 ? matches[0] : null;
    }
    const parts = section.replace(/Washington,?\s+D\.?\s*C\.?\b/ig,'Washington DC')
      .split(/[,，()]/).map(normalize).filter(Boolean);
    for (let i=0;i<parts.length;i++) {
      const part = parts[i];
      if (i && context.has('US') && usStates.has(part)) continue;
      const exact = qualify(part);
      if (exact) return exact;
    }
    for (let i=0;i<parts.length;i++) {
      const part = parts[i];
      if (i && context.has('US') && usStates.has(part)) continue;
      // Match a whole city name within a named university, hotel, or convention hall.
      for (const alias of aliases) {
        if (!words(part,alias)) continue;
        const point = qualify(alias);
        if (point) return point;
      }
    }
    return null;
  }

  function lookup(place) {
    const text = String(place || '');
    if (cache.has(text)) return cache.get(text);
    const points = [];
    for (const section of text.split(/\s*;\s*|\s*\/\s*|\s+&\s+|\s+and\s+(?=(?:online|hybrid|virtual)\b)/i)) {
      const point = resolve(section);
      if (point && !points.includes(point)) points.push(point);
    }
    const result = Object.freeze(points);
    cache.set(text,result);
    return result;
  }

  const project = (lon,lat) => [(lon+180)*1000/360,(90-lat)*500/180];
  window.CCF_GEO = Object.freeze({lookup, project});
})();
