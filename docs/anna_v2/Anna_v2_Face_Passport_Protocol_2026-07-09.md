# Anna v2 Face Passport Protocol

Дата: 2026-07-09

Статус: draft v1.

Назначение: правила создания нового face passport Anna v2 после успешного test batch.

## 1. Главный принцип

Face passport создается только после первого успешного Anna v2 test batch.

Старая Анна:

```text
test_archive / anti-reference only
```

Запрещено использовать как passport:

- old face chain;
- locked-face решения старой Анны;
- rejected emotion packs;
- старые LoRA/FaceID/IPAdapter результаты;
- любой кадр, выбранный до Product Bible и Visual Bible.

## 2. Цель face passport

Face passport нужен для:

- identity consistency;
- QC сравнения;
- будущей LoRA readiness;
- генерации новых эмоций/ракурсов;
- предотвращения face drift.

Он не является финальным dataset сам по себе.

## 3. Когда создавать

Создавать, когда:

- test batch прошел QC;
- есть 5-10 разноплановых кадров Anna v2;
- команда видит одного и того же человека;
- age-safety соблюден;
- grey-blue eyes стабильны;
- волосы/body/skin соответствуют Visual Bible.

Не создавать, если:

- лицо плавает;
- часть кадров выглядит другим человеком;
- есть teen-coded риск;
- кожа пластиковая;
- body proportions нестабильны.

## 4. Минимальный passport set

Обязательные кадры:

1. Front portrait.
2. 3/4 left.
3. 3/4 right.
4. Profile.
5. No-makeup daylight close-up.
6. Light smile.
7. Intimate gaze.
8. Gym mirror face.
9. Bedroom warm light face.
10. Outdoor golden hour face.

Дополнительные полезные кадры:

- neutral expression;
- soft laugh;
- thoughtful look;
- bratty/playful expression;
- hair tied up;
- hair down.

## 5. Passport identity checklist

Каждый кадр паспорта должен сохранять:

- soft oval/girl-next-door face;
- grey-blue eyes;
- fuller natural lips;
- groomed soft brows;
- warm honey blonde hair;
- adult 24-27 appearance;
- natural skin texture;
- relaxed adult gaze.

Beauty marks:

- ключица, если видна;
- веснушки на close-up/no-makeup кадрах;
- бедро только в body/lingerie passport extension, не в базовом face passport.

## 6. Что не включать

Не включать:

- explicit/hardcore;
- broken anatomy;
- heavy glam makeup;
- strong filters;
- plastic skin;
- blurry face;
- кадры без clear face;
- кадры с разной структурой лица;
- чужие reference identities.

## 7. Passport approval

Face passport считается approved, если:

- минимум 10 обязательных кадров есть;
- все получили QC `approved`;
- все выглядят как один человек;
- нет age-risk;
- нет copied identity risk;
- владелец проекта подтвердил direction.

После approval можно:

- готовить dataset/LoRA;
- делать identity stability tests;
- использовать passport для QC comparison.

## 8. Versioning

Рекомендуемая схема:

```text
anna_v2_face_passport_v1/
  01_front_portrait
  02_three_quarter_left
  03_three_quarter_right
  04_profile
  05_no_makeup_daylight
  06_light_smile
  07_intimate_gaze
  08_gym_mirror
  09_bedroom_warm_light
  10_outdoor_golden_hour
  manifest.md
```

При изменении лица:

- не перезаписывать v1;
- создать v2;
- описать причину изменения;
- повторить QC.

## 9. Face passport manifest

Manifest должен хранить:

- file name;
- shot type;
- lighting;
- camera style;
- expression;
- QC status;
- reason for inclusion;
- known weak points;
- hash/size if используется файловый архив.

## 10. Exit criteria

Face passport готов, когда его можно использовать как ответ на вопрос:

```text
выглядит ли новый кадр как Anna v2?
```

Если ответ неочевиден, паспорт еще слабый или test batch недостаточно стабилен.

