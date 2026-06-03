<x-mail::message>
@php
    $category = $book->genre ?? $book->resource_type ?? $copy['uncategorized'];
    $format = trim((string) ($book->file_format ?? ''));
    $formatSuffix = $book->file_size ? ' (' . $book->file_size . ')' : '';
@endphp

# {{ $copy['title'] }}

{{ $copy['greeting'] }}

{{ $copy['intro'] }}

- **{{ $copy['name_label'] }}:** {{ $book->title }}
- **{{ $copy['author'] }}:** {{ $book->author }}
- **{{ $copy['category'] }}:** {{ $category }}
@if($format !== '')
- **{{ $copy['format'] }}:** {{ $format }}{{ $formatSuffix }}
@endif

{{ $copy['instruction'] }}

{{ $copy['thank_you'] }}
{{ $copy['signature'] }}
</x-mail::message>
