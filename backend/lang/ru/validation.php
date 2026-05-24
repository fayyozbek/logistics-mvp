<?php

return [
    'required' => 'Поле «:attribute» обязательно.',
    'required_if' => 'Поле «:attribute» обязательно.',
    'required_without' => 'Укажите «:attribute».',
    'integer' => 'Поле «:attribute» должно быть целым числом.',
    'numeric' => 'Поле «:attribute» должно быть числом.',
    'string' => 'Поле «:attribute» должно быть строкой.',
    'boolean' => 'Поле «:attribute» должно быть да или нет.',
    'email' => 'Укажите корректный email в поле «:attribute».',
    'date' => 'Поле «:attribute» должно быть датой.',
    'max' => [
        'string' => 'Поле «:attribute» не должно быть длиннее :max символов.',
        'numeric' => 'Поле «:attribute» не должно быть больше :max.',
    ],
    'min' => [
        'numeric' => 'Поле «:attribute» должно быть не меньше :min.',
    ],
    'in' => 'Недопустимое значение в поле «:attribute».',
    'exists' => 'Выбранное значение в поле «:attribute» не найдено.',
    'unique' => 'Такое значение поля «:attribute» уже используется.',
    'regex' => 'Неверный формат поля «:attribute».',
    'array' => 'Поле «:attribute» должно быть списком.',
];
