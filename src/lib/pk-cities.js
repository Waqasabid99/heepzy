/**
 * Cities and towns of Pakistan, grouped by province (keys match PROVINCES in
 * `@/lib/checkout`). Used for the searchable city picker at checkout. Plain
 * data, safe to import on client and server. Spellings follow common courier
 * usage so delivery-zone matching (case-insensitive) lines up.
 */
const RAW = {
  PUNJAB: `Ahmedpur East, Alipur, Arifwala, Attock, Bahawalnagar, Bahawalpur, Basirpur, Bhakkar, Bhalwal, Bhawana,
    Burewala, Chak Jhumra, Chakwal, Chichawatni, Chiniot, Chishtian, Chunian, Daska, Depalpur, Dera Ghazi Khan,
    Dina, Dinga, Dunyapur, Faisalabad, Fateh Jang, Fort Abbas, Gojra, Gujar Khan, Gujranwala, Gujrat, Hafizabad,
    Haroonabad, Hasilpur, Hazro, Jalalpur Jattan, Jalalpur Pirwala, Jampur, Jaranwala, Jauharabad, Jhang, Jhelum,
    Kabirwala, Kahror Pakka, Kamalia, Kamoke, Kasur, Khanewal, Khanpur, Kharian, Khushab, Kot Addu, Kot Radha Kishan,
    Lahore, Lalamusa, Layyah, Liaquatpur, Lodhran, Mailsi, Malakwal, Mandi Bahauddin, Mian Channu, Mianwali, Minchinabad,
    Multan, Muridke, Murree, Muzaffargarh, Nankana Sahib, Narowal, Nowshera Virkan, Okara, Pakpattan, Pasrur, Pattoki,
    Phalia, Pind Dadan Khan, Pindi Bhattian, Pir Mahal, Qila Didar Singh, Rabwah, Rahim Yar Khan, Raiwind, Rajanpur,
    Rawalpindi, Renala Khurd, Sadiqabad, Safdarabad, Sahiwal, Sambrial, Sangla Hill, Sarai Alamgir, Sargodha,
    Shakargarh, Sheikhupura, Shorkot, Shujabad, Sialkot, Sillanwali, Talagang, Taunsa, Taxila, Toba Tek Singh,
    Vehari, Wazirabad, Yazman, Zafarwal`,
  SINDH: `Badin, Bhiria, Dadu, Daharki, Digri, Gambat, Ghotki, Hala, Hyderabad, Jacobabad, Jamshoro, Kandhkot,
    Kandiaro, Karachi, Kashmore, Khairpur, Kotri, Kunri, Larkana, Matiari, Mehar, Mirpur Khas, Mirpur Mathelo,
    Mithi, Moro, Nawabshah, Naushahro Feroze, Pano Aqil, Ratodero, Rohri, Sakrand, Sanghar, Sehwan, Shahdadkot,
    Shahdadpur, Shikarpur, Sujawal, Sukkur, Tando Adam, Tando Allahyar, Tando Muhammad Khan, Thatta, Umerkot`,
  KHYBER_PAKHTUNKHWA: `Abbottabad, Alpuri, Bannu, Batkhela, Battagram, Charsadda, Chitral, Daggar, Dera Ismail Khan,
    Dir, Hangu, Haripur, Havelian, Jamrud, Karak, Khar, Kohat, Lakki Marwat, Landi Kotal, Mansehra, Mardan, Mingora,
    Miranshah, Nowshera, Parachinar, Peshawar, Risalpur, Saidu Sharif, Shabqadar, Swabi, Tank, Timergara, Topi,
    Wana`,
  BALOCHISTAN: `Awaran, Barkhan, Bela, Chaman, Dalbandin, Dera Allah Yar, Dera Bugti, Dera Murad Jamali, Gwadar,
    Hub, Jiwani, Kalat, Kharan, Khuzdar, Kohlu, Loralai, Mastung, Muslim Bagh, Nushki, Ormara, Panjgur, Pasni,
    Pishin, Qila Abdullah, Qila Saifullah, Quetta, Sibi, Turbat, Usta Muhammad, Washuk, Zhob, Ziarat`,
  ISLAMABAD_CAPITAL_TERRITORY: `Islamabad`,
  GILGIT_BALTISTAN: `Aliabad, Astore, Chilas, Dasu, Gahkuch, Ghanche, Gilgit, Hunza, Karimabad, Khaplu, Nagar,
    Shigar, Skardu`,
  AZAD_KASHMIR: `Athmuqam, Bagh, Bhimber, Dadyal, Forward Kahuta, Hajira, Haveli, Kotli, Mirpur, Muzaffarabad,
    Pallandri, Rawalakot, Sudhnoti`,
};

/** { PROVINCE_KEY: ["City", …] } sorted A–Z. */
export const CITIES_BY_PROVINCE = Object.fromEntries(
  Object.entries(RAW).map(([p, s]) => [
    p,
    s
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b)),
  ]),
);

/** Case-insensitive: is `city` one of the listed cities of `province`? */
export function isListedCity(province, city) {
  const c = String(city ?? "")
    .trim()
    .toLowerCase();
  return (CITIES_BY_PROVINCE[province] ?? []).some((x) => x.toLowerCase() === c);
}

/** The canonical spelling of a listed city, or null. */
export function canonicalCity(province, city) {
  const c = String(city ?? "")
    .trim()
    .toLowerCase();
  return (CITIES_BY_PROVINCE[province] ?? []).find((x) => x.toLowerCase() === c) ?? null;
}
