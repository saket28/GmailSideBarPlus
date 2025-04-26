import { cleanName } from '../modules/emailScanner.js';

export function runTests({ test, assertStrictEqual }) {
    return [
        test('should return an empty string if input is null or undefined', () => {
            assertStrictEqual(cleanName(null), '');
            assertStrictEqual(cleanName(undefined), '');
        }),
        test('should return an empty string if input is an empty string', () => {
            assertStrictEqual(cleanName(''), '');
        }),
        test('should remove trailing dashes and optional periods', () => {
            assertStrictEqual(cleanName('John Doe -'), 'John Doe');
            assertStrictEqual(cleanName('Jane Smith —.'), 'Jane Smith');
        }),
        test('should split at the first invalid character and return the first part', () => {
            assertStrictEqual(cleanName('Alice123!'), 'Alice123');
            assertStrictEqual(cleanName('Bob@domain.com'), 'Bob');
        }),
        test('should handle names with special characters allowed in the first part', () => {
            assertStrictEqual(cleanName("O'Connor"), "O'Connor");
            assertStrictEqual(cleanName('Anne-Marie'), 'Anne-Marie');
        }),
        test('should trim leading and trailing whitespace', () => {
            assertStrictEqual(cleanName('   John   '), 'John');
            assertStrictEqual(cleanName('\tJane\n'), 'Jane');
        }),
        test('should handle names with multiple spaces or invalid characters', () => {
            assertStrictEqual(cleanName('John   Doe'), 'John   Doe');
            assertStrictEqual(cleanName('Jane@domain.com - CEO'), 'Jane');
        }),
        test('should handle names with no valid characters', () => {
            assertStrictEqual(cleanName('!!!'), '');
            assertStrictEqual(cleanName('---'), '');
        }),
        test('custom tests', () => {
            assertStrictEqual(cleanName('Foo - Bar Do.'), 'Foo - Bar');
            assertStrictEqual(cleanName('Capital One | Quick.'), 'Capital One'); 
            assertStrictEqual(cleanName('Capital One .'), 'Capital One'); 
            assertStrictEqual(cleanName('Deeplearning.AI'), 'Deeplearning.AI'); 
            assertStrictEqual(cleanName('Walmart Ex.'), 'Walmart');
            assertStrictEqual(cleanName('Bike Mart - Rich.'), 'Bike Mart');
            assertStrictEqual(cleanName('Foo (bar'), 'Foo');
            assertStrictEqual(cleanName('something.else(A) - .'), 'something.else');
            assertStrictEqual(cleanName('@test'), '@test');
            assertStrictEqual(cleanName('some@test'), 'some');
            assertStrictEqual(cleanName('García-López'), 'García-López');
            assertStrictEqual(cleanName('Dr. 李'), 'Dr. 李');
            assertStrictEqual(cleanName('公司名称 (北京)'), '公司名称');
        })
    ];
}